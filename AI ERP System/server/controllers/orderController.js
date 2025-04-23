// server/controllers/orderController.js
const Order = require('../models/Orders');
const { validationResult } = require('express-validator');
const { body, param, query } = require('express-validator');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

// Initialize AWS SNS client for order notifications
const snsClient = new SNSClient({ region: process.env.AWS_REGION });

// Validation rules
const orderValidationRules = [
    body('products').isArray().notEmpty().withMessage('Products array is required'),
    body('products.*.productId').isMongoId().withMessage('Valid product ID required'),
    body('products.*.quantity').isInt({ min: 1 }).withMessage('Valid quantity required'),
    body('totalAmount').isFloat({ min: 0 }).withMessage('Valid total amount required'),
    body('shippingAddress').notEmpty().withMessage('Shipping address is required'),
    body('paymentMethod').notEmpty().withMessage('Payment method is required')
];

const createOrder = async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const {
            products,
            totalAmount,
            shippingAddress,
            paymentMethod,
            notes
        } = req.body;

        // Check product inventory
        const inventoryCheck = await checkInventoryAvailability(products);
        if (!inventoryCheck.success) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Insufficient inventory',
                    details: inventoryCheck.details
                }
            });
        }

        // Create new order with additional fields
        const order = new Order({
            products,
            totalAmount,
            shippingAddress,
            paymentMethod,
            notes,
            userId: req.user.id, // Assuming auth middleware sets user
            status: 'pending',
            orderNumber: generateOrderNumber(),
            createdAt: new Date(),
            metadata: {
                userAgent: req.headers['user-agent'],
                ipAddress: req.ip
            }
        });

        // Save order
        await order.save();

        // Update inventory
        await updateInventory(products);

        // Send notification
        await sendOrderNotification(order);

        // Return response
        res.status(201).json({
            success: true,
            data: {
                order,
                estimatedDelivery: calculateEstimatedDelivery()
            }
        });

    } catch (err) {
        console.error('Create order error:', err);
        res.status(500).json({
            success: false,
            error: {
                message: 'Server error',
                code: 'ORDER_CREATION_FAILED'
            }
        });
    }
};

const getOrders = async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Filtering parameters
        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.minAmount) filter.totalAmount = { $gte: parseFloat(req.query.minAmount) };
        if (req.query.maxAmount) filter.totalAmount = { ...filter.totalAmount, $lte: parseFloat(req.query.maxAmount) };
        if (req.query.dateFrom) filter.createdAt = { $gte: new Date(req.query.dateFrom) };
        if (req.query.dateTo) filter.createdAt = { ...filter.createdAt, $lte: new Date(req.query.dateTo) };

        // Sorting
        const sort = {};
        if (req.query.sortBy) {
            const sortField = req.query.sortBy;
            sort[sortField] = req.query.sortOrder === 'desc' ? -1 : 1;
        } else {
            sort.createdAt = -1; // Default sort by creation date
        }

        // Execute query with pagination and filtering
        const orders = await Order.find(filter)
            .populate('products.productId')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();

        // Get total count for pagination
        const total = await Order.countDocuments(filter);

        res.json({
            success: true,
            data: {
                orders,
                pagination: {
                    current: page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (err) {
        console.error('Get orders error:', err);
        res.status(500).json({
            success: false,
            error: {
                message: 'Server error',
                code: 'ORDER_FETCH_FAILED'
            }
        });
    }
};

const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('products.productId')
            .populate('userId', 'name email');

        if (!order) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Order not found',
                    code: 'ORDER_NOT_FOUND'
                }
            });
        }

        res.json({
            success: true,
            data: { order }
        });

    } catch (err) {
        console.error('Get order by ID error:', err);
        res.status(500).json({
            success: false,
            error: {
                message: 'Server error',
                code: 'ORDER_FETCH_FAILED'
            }
        });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Order not found',
                    code: 'ORDER_NOT_FOUND'
                }
            });
        }

        order.status = status;
        order.updatedAt = new Date();
        order.statusHistory.push({
            status,
            timestamp: new Date(),
            updatedBy: req.user.id
        });

        await order.save();
        await sendOrderStatusNotification(order);

        res.json({
            success: true,
            data: { order }
        });

    } catch (err) {
        console.error('Update order status error:', err);
        res.status(500).json({
            success: false,
            error: {
                message: 'Server error',
                code: 'ORDER_UPDATE_FAILED'
            }
        });
    }
};

// Helper functions
const generateOrderNumber = () => {
    return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const calculateEstimatedDelivery = () => {
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 3); // Example: 3 days delivery
    return deliveryDate;
};

const checkInventoryAvailability = async (products) => {
    // Implement inventory check logic
    return { success: true };
};

const updateInventory = async (products) => {
    // Implement inventory update logic
};

const sendOrderNotification = async (order) => {
    try {
        await snsClient.send(new PublishCommand({
            TopicArn: process.env.ORDER_NOTIFICATION_TOPIC_ARN,
            Message: JSON.stringify({
                orderNumber: order.orderNumber,
                status: order.status,
                totalAmount: order.totalAmount
            })
        }));
    } catch (error) {
        console.error('SNS notification error:', error);
    }
};

const sendOrderStatusNotification = async (order) => {
    // Implement status notification logic
};

module.exports = {
    createOrder,
    getOrders,
    getOrderById,
    updateOrderStatus,
    orderValidationRules
};
