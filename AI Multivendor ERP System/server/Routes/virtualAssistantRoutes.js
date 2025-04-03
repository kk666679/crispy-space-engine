// server/routes/virtualAssistantRoutes.js
const express = require('express');
const { body } = require('express-validator');
const { handleQuery } = require('../controllers/virtualAssistantController');

const router = express.Router();

router.post(
    '/virtual-assistant',
    [body('query').notEmpty().withMessage('Query is required')],
    handleQuery
);

module.exports = router;