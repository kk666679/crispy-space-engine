// server/controllers/aiController.js
const chatbotModel = require('../ai_backend/chatbotModel');
const recommendationModel = require('../ai_backend/recommendationModel');
const { validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { PersonalizeRuntimeClient, GetRecommendationsCommand } = require("@aws-sdk/client-personalize-runtime");

// Initialize AWS Personalize client
const personalizeRuntimeClient = new PersonalizeRuntimeClient({ 
    region: process.env.AWS_REGION
});

// Rate limiting configuration
const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// Input validation middleware
const validateChatInput = [
    body('message').trim().notEmpty().withMessage('Message cannot be empty')
        .isLength({ max: 1000 }).withMessage('Message too long'),
    body('sessionId').optional().isString()
];

const getChatbotResponse = async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { message, sessionId } = req.body;
        
        // Add context tracking
        const context = {
            sessionId: sessionId || generateSessionId(),
            timestamp: new Date().toISOString(),
            userId: req.user?.id // Assuming authentication middleware
        };

        const response = await chatbotModel.getResponse(message, context);
        
        // Log interaction for analytics
        await logInteraction({
            type: 'chatbot',
            message,
            response,
            context
        });

        res.json({
            success: true,
            data: {
                response,
                sessionId: context.sessionId
            }
        });

    } catch (err) {
        console.error('Chatbot error:', err);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error',
                code: 'CHATBOT_ERROR'
            }
        });
    }
};

const getRecommendations = async (req, res) => {
    try {
        const { userId } = req.params;
        const { numResults = 10, filterArn } = req.query;

        // Validate user ID
        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Invalid user ID',
                    code: 'INVALID_USER_ID'
                }
            });
        }

        // Get personalized recommendations using AWS Personalize
        const personalizeParams = {
            campaignArn: process.env.PERSONALIZE_CAMPAIGN_ARN,
            userId,
            numResults: parseInt(numResults),
            ...(filterArn && { filterArn })
        };

        const personalizeResponse = await personalizeRuntimeClient.send(
            new GetRecommendationsCommand(personalizeParams)
        );

        // Enrich recommendations with additional data
        const enrichedRecommendations = await recommendationModel.enrichRecommendations(
            personalizeResponse.itemList
        );

        // Cache results if needed
        await cacheRecommendations(userId, enrichedRecommendations);

        res.json({
            success: true,
            data: {
                recommendations: enrichedRecommendations,
                timestamp: new Date().toISOString()
            }
        });

    } catch (err) {
        console.error('Recommendations error:', err);
        
        // Handle specific AWS errors
        if (err.name === 'ResourceNotFoundException') {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Recommendation campaign not found',
                    code: 'CAMPAIGN_NOT_FOUND'
                }
            });
        }

        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error',
                code: 'RECOMMENDATIONS_ERROR'
            }
        });
    }
};

// Helper functions
const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const logInteraction = async (data) => {
    // Implement logging logic (e.g., to CloudWatch or database)
    // ...
};

const cacheRecommendations = async (userId, recommendations) => {
    // Implement caching logic
    // ...
};

module.exports = {
    getChatbotResponse,
    getRecommendations,
    rateLimiter,
    validateChatInput
};
