// server/config/paymentGateway.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('./logger'); // Assume we have a logging utility

class PaymentGateway {
    constructor() {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('STRIPE_SECRET_KEY is not configured');
        }

        this.stripe = stripe;
        this.supportedCurrencies = new Set(['usd', 'eur', 'gbp']);
        this.minimumAmount = {
            usd: 50, // 50 cents minimum
            eur: 50,
            gbp: 30
        };
    }

    /**
     * Validate payment amount and currency
     * @private
     */
    validateAmount(amount, currency) {
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            throw new Error('Invalid amount. Amount must be a positive number.');
        }

        const minAmount = this.minimumAmount[currency.toLowerCase()];
        if (amount < minAmount) {
            throw new Error(`Amount must be at least ${minAmount / 100} ${currency.toUpperCase()}`);
        }
    }

    /**
     * Validate payment method
     * @private
     */
    validatePaymentMethod(paymentMethod) {
        if (!paymentMethod || typeof paymentMethod !== 'string') {
            throw new Error('Invalid payment method. Payment method must be a non-empty string.');
        }
    }

    /**
     * Process a payment using Stripe
     * @param {Object} paymentDetails - Payment details
     * @returns {Promise<Object>} Stripe payment intent object
     */
    async processPayment({
        amount,
        currency = 'usd',
        paymentMethod,
        description,
        metadata = {},
        customerId,
        receiptEmail,
        statementDescriptor
    }) {
        try {
            // Validate inputs
            this.validateAmount(amount, currency);
            this.validatePaymentMethod(paymentMethod);

            if (!this.supportedCurrencies.has(currency.toLowerCase())) {
                throw new Error(`Unsupported currency: ${currency}`);
            }

            // Log payment attempt
            logger.info('Processing payment', {
                amount,
                currency,
                description,
                customerId,
                receiptEmail
            });

            // Create payment intent
            const paymentIntentParams = {
                amount,
                currency: currency.toLowerCase(),
                payment_method: paymentMethod,
                confirm: true,
                description,
                metadata: {
                    ...metadata,
                    processedAt: new Date().toISOString()
                },
                receipt_email: receiptEmail,
                statement_descriptor: statementDescriptor
            };

            if (customerId) {
                paymentIntentParams.customer = customerId;
            }

            // Create and confirm payment intent
            const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentParams);

            // Log successful payment
            logger.info('Payment processed successfully', {
                paymentIntentId: paymentIntent.id,
                amount,
                currency,
                customerId
            });

            return paymentIntent;

        } catch (error) {
            this.handlePaymentError(error);
        }
    }

    /**
     * Create a refund for a payment
     * @param {string} paymentIntentId - The payment intent ID to refund
     * @param {number} amount - Amount to refund (optional, defaults to full amount)
     */
    async createRefund(paymentIntentId, amount = null) {
        try {
            const refundParams = {
                payment_intent: paymentIntentId,
                ...(amount && { amount })
            };

            logger.info('Processing refund', refundParams);

            const refund = await this.stripe.refunds.create(refundParams);

            logger.info('Refund processed successfully', {
                refundId: refund.id,
                paymentIntentId,
                amount: refund.amount
            });

            return refund;

        } catch (error) {
            this.handlePaymentError(error);
        }
    }

    /**
     * Create a customer in Stripe
     * @param {Object} customerData - Customer details
     */
    async createCustomer({
        email,
        name,
        phone,
        metadata = {}
    }) {
        try {
            logger.info('Creating customer', { email, name });

            const customer = await this.stripe.customers.create({
                email,
                name,
                phone,
                metadata
            });

            logger.info('Customer created successfully', {
                customerId: customer.id,
                email
            });

            return customer;

        } catch (error) {
            this.handlePaymentError(error);
        }
    }

    /**
     * Handle payment errors
     * @private
     */
    handlePaymentError(error) {
        logger.error('Payment processing error', {
            error: error.message,
            code: error.code,
            type: error.type
        });

        if (error.type === 'StripeCardError') {
            throw new Error('Your card was declined. Please try another payment method.');
        } else if (error.type === 'StripeRateLimitError') {
            throw new Error('Too many requests. Please try again later.');
        } else if (error.type === 'StripeInvalidRequestError') {
            throw new Error('Invalid payment details provided.');
        } else if (error.type === 'StripeAPIError') {
            throw new Error('Payment service temporarily unavailable. Please try again later.');
        } else if (error.type === 'StripeConnectionError') {
            throw new Error('Could not connect to payment service. Please try again.');
        } else {
            throw new Error('Payment processing failed. Please try again later.');
        }
    }

    /**
     * Retrieve payment intent details
     */
    async getPaymentIntent(paymentIntentId) {
        try {
            return await this.stripe.paymentIntents.retrieve(paymentIntentId);
        } catch (error) {
            this.handlePaymentError(error);
        }
    }

    /**
     * Create a payment method
     */
    async createPaymentMethod(paymentMethodData) {
        try {
            return await this.stripe.paymentMethods.create(paymentMethodData);
        } catch (error) {
            this.handlePaymentError(error);
        }
    }
}

// Create and export payment gateway instance
const paymentGateway = new PaymentGateway();
module.exports = paymentGateway;

// Usage example:
/*
const paymentGateway = require('./config/paymentGateway');

async function processPaymentExample() {
    try {
        // Create a customer
        const customer = await paymentGateway.createCustomer({
            email: 'customer@example.com',
            name: 'John Doe',
            phone: '+1234567890'
        });

        // Process payment
        const paymentIntent = await paymentGateway.processPayment({
            amount: 1000, // $10.00
            currency: 'usd',
            paymentMethod: 'pm_card_visa',
            description: 'Product purchase',
            customerId: customer.id,
            receiptEmail: 'customer@example.com',
            statementDescriptor: 'MyStore Purchase',
            metadata: {
                orderId: '12345',
                productId: 'prod_123'
            }
        });

        console.log('Payment processed:', paymentIntent);

    } catch (error) {
        console.error('Payment error:', error.message);
    }
}
*/
