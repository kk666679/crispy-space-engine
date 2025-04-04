// server/controllers/financeController.js
const Payment = require('../models/Payment');
const { validationResult } = require('express-validator');
const { body } = require('express-validator');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

// Initialize AWS SQS client
const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

// Validation rules
const paymentValidationRules = [
    body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount required'),
    body('paymentMethod').isObject().withMessage('Payment method details required'),
    body('paymentMethod.type').isIn(['credit_card', 'debit_card', 'bank_transfer'])
        .withMessage('Valid payment method type required'),
    body('currency').isString().isLength({ min: 3, max: 3 }).withMessage('Valid currency code required'),
    body('description').optional().isString().trim()
];

const processPayment = async (req, res) => {
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
            amount,
            paymentMethod,
            currency = 'USD',
            description,
            customerId
        } = req.body;

        // Create idempotency key to prevent duplicate payments
        const idempotencyKey = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Initialize payment processing
        const paymentIntent = await createPaymentIntent({
            amount,
            currency,
            paymentMethod,
            customerId,
            description,
            idempotencyKey
        });

        // Create payment record
        const payment = new Payment({
            amount,
            currency,
            paymentMethod: paymentMethod.type,
            status: 'pending',
            transactionId: paymentIntent.id,
            customerId,
            description,
            metadata: {
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                idempotencyKey
            }
        });

        // Process the payment
        const processedPayment = await processPaymentWithProvider(paymentIntent);

        // Update payment record
        payment.status = processedPayment.status;
        payment.processingDetails = {
            processorResponse: processedPayment.processor_response,
            lastFour: processedPayment.payment_method_details?.last4,
            processingTime: new Date()
        };

        await payment.save();

        // Send payment notification
        await sendPaymentNotification(payment);

        // Record transaction for accounting
        await recordTransaction(payment);

        res.status(201).json({
            success: true,
            data: {
                payment: {
                    id: payment._id,
                    amount: payment.amount,
                    currency: payment.currency,
                    status: payment.status,
                    transactionId: payment.transactionId,
                    createdAt: payment.createdAt
                },
                receiptUrl: processedPayment.receipt_url
            }
        });

    } catch (err) {
        console.error('Process payment error:', err);
        
        // Handle specific payment errors
        if (err.type === 'StripeCardError') {
            return res.status(400).json({
                success: false,
                error: {
                    message: err.message,
                    code: 'PAYMENT_FAILED',
                    type: err.type
                }
            });
        }

        res.status(500).json({
            success: false,
            error: {
                message: 'Payment processing failed',
                code: 'INTERNAL_PAYMENT_ERROR'
            }
        });
    }
};

const getPaymentHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

        const query = {};
        if (startDate && endDate) {
            query.createdAt = {
                $gte: startDate,
                $lte: endDate
            };
        }

        if (req.query.status) {
            query.status = req.query.status;
        }

        const payments = await Payment.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .select('-metadata -__v');

        const total = await Payment.countDocuments(query);

        res.json({
            success: true,
            data: {
                payments,
                pagination: {
                    current: page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (err) {
        console.error('Get payment history error:', err);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to retrieve payment history',
                code: 'PAYMENT_HISTORY_ERROR'
            }
        });
    }
};

// Helper functions
const createPaymentIntent = async ({
    amount,
    currency,
    paymentMethod,
    customerId,
    description,
    idempotencyKey
}) => {
    return await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        payment_method: paymentMethod.id,
        customer: customerId,
        description,
        confirm: true,
        metadata: {
            idempotencyKey
        }
    });
};

const processPaymentWithProvider = async (paymentIntent) => {
    // Implement payment processing logic
    return await stripe.paymentIntents.confirm(paymentIntent.id);
};

const sendPaymentNotification = async (payment) => {
    try {
        await sqsClient.send(new SendMessageCommand({
            QueueUrl: process.env.PAYMENT_NOTIFICATION_QUEUE_URL,
            MessageBody: JSON.stringify({
                paymentId: payment._id,
                amount: payment.amount,
                status: payment.status,
                timestamp: new Date().toISOString()
            })
        }));
    } catch (error) {
        console.error('Payment notification error:', error);
    }
};

const recordTransaction = async (payment) => {
    // Implement transaction recording logic for accounting
};

module.exports = {
    processPayment,
    getPaymentHistory,
    paymentValidationRules
};
