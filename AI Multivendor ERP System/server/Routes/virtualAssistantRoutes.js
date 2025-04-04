 // server/routes/virtualAssistantRoutes.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const { handleQuery } = require('../controllers/virtualAssistantController');
const rateLimit = require('express-rate-limit');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

// Rate limiting configuration
const assistantLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
});

// Input validation middleware
const validateQuery = [
    body('query')
        .notEmpty()
        .withMessage('Query is required')
        .trim()
        .isLength({ min: 2, max: 500 })
        .withMessage('Query must be between 2 and 500 characters'),
    body('language')
        .optional()
        .isIn(['en', 'es', 'fr'])
        .withMessage('Invalid language selection'),
    body('context')
        .optional()
        .isObject()
        .withMessage('Context must be an object')
];

// Validation error handler middleware
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
    console.error('Virtual Assistant Error:', err);
    res.status(500).json({
        success: false,
        message: 'An error occurred while processing your request',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};

// Routes
router.post(
    '/query',
    assistantLimiter,
    authenticateUser,
    validateQuery,
    handleValidationErrors,
    async (req, res, next) => {
        try {
            await handleQuery(req, res);
        } catch (error) {
            next(error);
        }
    }
);

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// Get assistant status
router.get('/status', authenticateUser, (req, res) => {
    res.status(200).json({
        available: true,
        maxQueryLength: 500,
        supportedLanguages: ['en', 'es', 'fr'],
        version: '1.0.0'
    });
});

// Apply error handler
router.use(errorHandler);

module.exports = router;
