// server/routes/aiRoutes.js
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { 
    getChatbotResponse, 
    getRecommendations,
    getConversationHistory,
    clearConversationHistory,
    getProductAnalytics,
    getBehaviorInsights
} = require('../controllers/aiController');
const { authenticateUser, rateLimiter } = require('../middleware/auth');
const cache = require('../middleware/cache');

const router = express.Router();

// Validation middleware
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
};

// Chatbot message validation
const chatbotValidation = [
    body('message')
        .notEmpty()
        .withMessage('Message is required')
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage('Message must be between 1 and 1000 characters'),
    
    body('context')
        .optional()
        .isObject()
        .withMessage('Context must be an object'),
    
    body('language')
        .optional()
        .isIn(['en', 'es', 'fr'])
        .withMessage('Unsupported language'),
    
    body('sessionId')
        .optional()
        .isString()
        .isLength({ min: 10, max: 100 })
        .withMessage('Invalid session ID')
];

// Configure rate limiter for AI endpoints
const aiRateLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
});

// Routes
router.post(
    '/chatbot',
    authenticateUser,
    aiRateLimiter,
    chatbotValidation,
    validateRequest,
    async (req, res, next) => {
        try {
            await getChatbotResponse(req, res);
        } catch (error) {
            next(error);
        }
    }
);

router.get(
    '/recommendations/:userId',
    authenticateUser,
    [
        param('userId').isMongoId().withMessage('Invalid user ID'),
        query('category').optional().isString(),
        query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
        query('type').optional().isIn(['products', 'services', 'vendors']),
    ],
    validateRequest,
    cache.set(300), // Cache for 5 minutes
    async (req, res, next) => {
        try {
            await getRecommendations(req, res);
        } catch (error) {
            next(error);
        }
    }
);

router.get(
    '/conversation-history',
    authenticateUser,
    [
        query('startDate').optional().isISO8601(),
        query('endDate').optional().isISO8601(),
        query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
        query('page').optional().isInt({ min: 1 }).toInt()
    ],
    validateRequest,
    async (req, res, next) => {
        try {
            await getConversationHistory(req, res);
        } catch (error) {
            next(error);
        }
    }
);

router.delete(
    '/conversation-history',
    authenticateUser,
    async (req, res, next) => {
        try {
            await clearConversationHistory(req, res);
        } catch (error) {
            next(error);
        }
    }
);

router.get(
    '/analytics/products',
    authenticateUser,
    [
        query('startDate').optional().isISO8601(),
        query('endDate').optional().isISO8601(),
        query('category').optional().isString(),
    ],
    validateRequest,
    cache.set(600), // Cache for 10 minutes
    async (req, res, next) => {
        try {
            await getProductAnalytics(req, res);
        } catch (error) {
            next(error);
        }
    }
);

router.get(
    '/insights/behavior',
    authenticateUser,
    [
        query('userId').optional().isMongoId(),
        query('timeframe').optional().isIn(['day', 'week', 'month', 'year']),
    ],
    validateRequest,
    cache.set(900), // Cache for 15 minutes
    async (req, res, next) => {
        try {
            await getBehaviorInsights(req, res);
        } catch (error) {
            next(error);
        }
    }
);

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            chatbot: true,
            recommendations: true
        }
    });
});

// Error handling middleware
router.use((err, req, res, next) => {
    console.error('AI Route Error:', err);
    
    // Handle specific AI service errors
    if (err.name === 'AIServiceError') {
        return res.status(503).json({
            success: false,
            message: 'AI service temporarily unavailable',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    res.status(500).json({
        success: false,
        message: 'An error occurred while processing your request',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

module.exports = router;
