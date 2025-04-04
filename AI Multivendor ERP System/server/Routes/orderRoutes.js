// server/routes/orderRoutes.js
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { 
    createOrder, 
    getOrders, 
    getOrderById, 
    updateOrderStatus, 
    cancelOrder,
    getOrderStats
} = require('../controllers/orderController');
const { authenticateUser, authorizeVendor } = require('../middleware/auth');

const router = express.Router();

// Validation rules for order creation
const orderValidationRules = [
    body('products')
        .isArray({ min: 1 }).withMessage('At least one product is required')
        .custom((products) => {
            return products.every(product => {
                return (
                    product.productId &&
                    product.quantity > 0 &&
                    product.price >= 0
                );
            });
        }).withMessage('Invalid product format'),

    body('products.*.productId')
        .isMongoId()
        .withMessage('Invalid product ID'),

    body('products.*.quantity')
        .isInt({ min: 1 })
        .withMessage('Quantity must be at least 1'),

    body('products.*.price')
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),

    body('totalAmount')
        .isFloat({ min: 0 })
        .withMessage('Total amount must be a positive number'),

    body('shippingAddress')
        .notEmpty()
        .isObject()
        .withMessage('Shipping address is required'),

    body('shippingAddress.street')
        .notEmpty()
        .trim()
        .withMessage('Street address is required'),

    body('shippingAddress.city')
        .notEmpty()
        .trim()
        .withMessage('City is required'),

    body('shippingAddress.state')
        .notEmpty()
        .trim()
        .withMessage('State is required'),

    body('shippingAddress.zipCode')
        .notEmpty()
        .trim()
        .matches(/^\d{5}(-\d{4})?$/)
        .withMessage('Invalid ZIP code'),

    body('paymentMethod')
        .notEmpty()
        .isIn(['credit_card', 'debit_card', 'bank_transfer', 'digital_wallet'])
        .withMessage('Invalid payment method'),

    body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notes cannot exceed 500 characters')
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
    '/orders',
    authenticateUser,
    orderValidationRules,
    validateRequest,
    async (req, res, next) => {
        try {
            await createOrder(req, res);
        } catch (error) {
            next(error);
        }
    }
);

router.get(
    '/orders',
    authenticateUser,
    [
        query('page').optional().isInt({ min: 1 }).toInt(),
        query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
        query('status').optional().isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
        query('startDate').optional().isISO8601(),
        query('endDate').optional().isISO8601(),
        query('sortBy').optional().isIn(['createdAt', 'totalAmount', 'status']),
        query('order').optional().isIn(['asc', 'desc'])
    ],
    validateRequest,
    async (req, res, next) => {
        try {
            await getOrders(req, res);
        } catch (error) {
            next(error);
        }
    }
);

router.get(
    '/orders/:id',
    authenticateUser,
    [param('id').isMongoId().withMessage('Invalid order ID')],
    validateRequest,
    async (req, res, next) => {
        try {
            await getOrderById(req, res);
        } catch (error) {
            next(error);
        }
    }
);

router.patch(
    '/orders/:id/status',
    authenticateUser,
    authorizeVendor,
    [
        param('id').isMongoId().withMessage('Invalid order ID'),
        body('status')
            .isIn(['processing', 'shipped', 'delivered', 'cancelled'])
            .withMessage('Invalid status'),
        body('statusNote')
            .optional()
            .trim()
            .isLength({ max: 200 })
            .withMessage('Status note cannot exceed 200 characters')
    ],
    validateRequest,
    async (req, res, next) => {
        try {
            await updateOrderStatus(req, res);
        } catch (error) {
            next(error);
        }
    }
);

router.post(
    '/orders/:id/cancel',
    authenticateUser,
    [
        param('id').isMongoId().withMessage('Invalid order ID'),
        body('reason')
            .notEmpty()
            .trim()
            .isLength({ max: 200 })
            .withMessage('Cancellation reason is required and cannot exceed 200 characters')
    ],
    validateRequest,
    async (req, res, next) => {
        try {
            await cancelOrder(req, res);
        } catch (error) {
            next(error);
        }
    }
);

router.get(
    '/orders/stats/summary',
    authenticateUser,
    authorizeVendor,
    [
        query('startDate').optional().isISO8601(),
        query('endDate').optional().isISO8601()
    ],
    validateRequest,
    async (req, res, next) => {
        try {
            await getOrderStats(req, res);
        } catch (error) {
            next(error);
        }
    }
);

// Error handling middleware
router.use((err, req, res, next) => {
    console.error('Order Route Error:', err);
    res.status(500).json({
        success: false,
        message: 'An error occurred while processing your request',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

module.exports = router;
