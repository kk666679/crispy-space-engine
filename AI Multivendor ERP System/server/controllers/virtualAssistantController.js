// server/controllers/virtualAssistantController.js
const virtualAssistant = require('../ai_backend/virtualAssistant');
const { validationResult } = require('express-validator');

const handleQuery = async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { query } = req.body;
        const response = await virtualAssistant.processQuery(query);
        res.json({ response });
    } catch (err) {
        console.error('Virtual assistant error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { handleQuery };