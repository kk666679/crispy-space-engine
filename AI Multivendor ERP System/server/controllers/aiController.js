// server/controllers/aiController.js
const chatbotModel = require('../ai_backend/chatbotModel');
const recommendationModel = require('../ai_backend/recommendationModel');
const { validationResult } = require('express-validator');

const getChatbotResponse = async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { message } = req.body;
        const response = await chatbotModel.getResponse(message);
        res.json({ response });
    } catch (err) {
        console.error('Chatbot error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const getRecommendations = async (req, res) => {
    try {
        const { userId } = req.params;
        const recommendations = await recommendationModel.getRecommendations(userId);
        res.json({ recommendations });
    } catch (err) {
        console.error('Recommendations error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getChatbotResponse, getRecommendations };