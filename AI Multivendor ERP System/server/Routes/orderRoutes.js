// server/routes/orderRoutes.js
const express = require('express');
const { body } = require('express-validator');
const { createOrder, getOrders } = require('../controllers/orderController');

const router = express.Router();

router.post(
    '/orders',
    [
        body('products').isArray().withMessage('Products must be an array'),
        body('totalAmount').isNumeric().withMessage('Total amount must be a number'),
    ],
    createOrder
);

router.get('/orders', getOrders);

module.exports = router;