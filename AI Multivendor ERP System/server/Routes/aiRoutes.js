// server/routes/aiRoutes.js
const express = require('express');
const { body } = require('express-validator');
const { getChatbotResponse, getRecommendations } = require('../controllers/aiController');

const router = express.Router();

router.post(
    '/chatbot',
    [body('message').notEmpty().withMessage('Message is required')],
    getChatbotResponse
);

router.get('/recommendations/:userId', getRecommendations);

module.exports = router;