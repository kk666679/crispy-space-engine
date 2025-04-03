// server/controllers/orderController.js
const Order = require(../models/Orders);
import { validationResult } from 'express-validator';

const createOrder = async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { products, totalAmount } = req.body;

        // Create new order
        const order = new Order({ products, totalAmount });
        await order.save();
        res.status(201).json(order);
    } catch (err) {
        console.error('Create order error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const getOrders = async (req, res) => {
    try {
        const orders = await Order.find().populate('products');
        res.json(orders);
    } catch (err) {
        console.error('Get orders error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export default { createOrder, getOrders };