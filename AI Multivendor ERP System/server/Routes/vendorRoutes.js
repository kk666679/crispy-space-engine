// server/routes/vendorRoutes.js
const express = require('express');
const { body } = require('express-validator');
const { createVendor, getVendors } = require('../controllers/vendorController');

const router = express.Router();

router.post(
    '/vendors',
    [
        body('name').notEmpty().withMessage('Name is required'),
        body('email').isEmail().withMessage('Invalid email'),
        body('phone').notEmpty().withMessage('Phone is required'),
    ],
    createVendor
);

router.get('/vendors', getVendors);

module.exports = router;