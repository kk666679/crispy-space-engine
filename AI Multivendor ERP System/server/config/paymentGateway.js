// server/config/paymentGateway.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Process a payment using Stripe.
 *
 * @param {number} amount - The payment amount in cents (e.g., 1000 for $10.00).
 * @param {string} paymentMethod - The payment method ID provided by the client.
 * @returns {object} - The Stripe payment intent object.
 * @throws {Error} - Throws an error if payment processing fails.
 */
const processPayment = async (amount, paymentMethod) => {
    try {
        // Validate input
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            throw new Error('Invalid amount. Amount must be a positive number.');
        }
        if (!paymentMethod || typeof paymentMethod !== 'string') {
            throw new Error('Invalid payment method. Payment method must be a non-empty string.');
        }

        // Log the payment details (excluding sensitive information)
        console.log(`Processing payment: Amount=${amount} cents, PaymentMethod=${paymentMethod}`);

        // Create a payment intent using Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: 'usd',
            payment_method: paymentMethod,
            confirm: true,
        });

        // Log the successful payment intent
        console.log(`Payment successful: PaymentIntentID=${paymentIntent.id}`);
        return paymentIntent;
    } catch (err) {
        // Log the error with details
        console.error('Payment processing error:', err.message);
        throw new Error('Payment processing failed. Please try again later.');
    }
};

module.exports = { processPayment };

const { processPayment } = require('./config/paymentGateway');

(async () => {
    try {
        const paymentIntent = await processPayment(1000, 'pm_card_visa'); // Example payment method ID
        console.log('Payment Intent:', paymentIntent);
    } catch (err) {
        console.error('Error:', err.message);
    }
})();

STRIPE_SECRET_KEY=your_stripe_secret_key