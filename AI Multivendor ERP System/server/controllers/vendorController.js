// server/controllers/vendorController.js
const Vendor = require('../models/Vendor');
const { validationResult } = require('express-validator');

const createVendor = async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, phone } = req.body;

        // Check if vendor already exists
        const existingVendor = await Vendor.findOne({ email });
        if (existingVendor) {
            return res.status(400).json({ message: 'Vendor already exists' });
        }

        // Create new vendor
        const vendor = new Vendor({ name, email, phone });
        await vendor.save();
        res.status(201).json(vendor);
    } catch (err) {
        console.error('Create vendor error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const getVendors = async (req, res) => {
    try {
        const vendors = await Vendor.find();
        res.json(vendors);
    } catch (err) {
        console.error('Get vendors error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { createVendor, getVendors };