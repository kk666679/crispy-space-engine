// server/routes/vendorRoutes.js
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { createVendor, getVendors, getVendorById, updateVendor, deleteVendor } = require('../controllers/vendorController');
const { authenticateUser, authorizeAdmin } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const vendorValidationRules = [
    body('name')
        .notEmpty().withMessage('Name is required')
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail()
        .custom(async (email, { req }) => {
            // Add custom validation for unique email if needed
            return true;
        }),
    
    body('phone')
        .notEmpty().withMessage('Phone is required')
        .matches(/^\+?[\d\s-()]{10,}$/).withMessage('Invalid phone number format'),
    
    body('address')
        .optional()
        .trim()
        .isLength({ min: 5, max: 200 }).withMessage('Address must be between 5 and 200 characters'),
    
    body('taxId')
        .optional()
        .trim()
        .matches(/^[A-Z0-9-]{5,20}$/).withMessage('Invalid Tax ID format'),
    
    body('status')
        .optional()
        .isIn(['active', 'inactive', 'pending']).withMessage('Invalid status')
];

// Validation error handler
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

// Routes
router.post(
    '/vendors',
    authenticateUser,
    authorizeAdmin,
    vendorValidationRules,
    validateRequest,
    async (req, res, next) => {
        try {
            await createVendor(req, res);
        } catch (error) {
            next(error);
        }
    }
);

router.get(
    '/vendors',
    authenticateUser,
    [
        query('page').optional().isInt({ min: 1 }).toInt(),
        query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
        query('status').optional().isIn(['active', 'inactive', 'pending']),
        query('sortBy').optional().isIn(['name', 'createdAt', 'status']),
        query('order').optional().isIn(['asc', 'desc'])
    ],
    validateRequest,
    async (req, res, next) => {
        try {
            await getVendors(req, res);
        } catch (error) {
            next(error);
        }
    }
);

router.get(
    '/vendors/:id',
    authenticateUser,
    [param('id').isMongoId().withMessage('Invalid vendor ID')],
    validateRequest,
    async (req, res, next) => {
        try {
            await getVendorById(req, res);
        } catch (error) {
            next(error);
        }
    }
);

router.put(
    '/vendors/:id',
    authenticateUser,
    authorizeAdmin,
    [
        param('id').isMongoId().withMessage('Invalid vendor ID'),
        ...vendorValidationRules.map(rule => rule.optional())
    ],
    validateRequest,
    async (req, res, next) => {
        try {
            await updateVendor(req, res);
        } catch (error) {
            next(error);
        }
    }
);

router.delete(
    '/vendors/:id',
    authenticateUser,
    authorizeAdmin,
    [param('id').isMongoId().withMessage('Invalid vendor ID')],
    validateRequest,
    async (req, res, next) => {
        try {
            await deleteVendor(req, res);
        } catch (error) {
            next(error);
        }
    }
);

// Error handling middleware
router.use((err, req, res, next) => {
    console.error('Vendor Route Error:', err);
    res.status(500).json({
        success: false,
        message: 'An error occurred while processing your request',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

module.exports = router;
