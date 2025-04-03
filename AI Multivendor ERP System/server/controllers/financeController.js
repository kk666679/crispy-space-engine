// server/controllers/financeController.js
const Payment = require('../models/Payment');
const { validationResult } = require('express-validator');

const processPayment = async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { amount, paymentMethod } = req.body;

        // Process payment
        const payment = new Payment({ amount, paymentMethod });
        await payment.save();
        res.status(201).json(payment);
    } catch (err) {
        console.error('Process payment error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { processPayment };