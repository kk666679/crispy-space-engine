// server/middleware/aiMiddleware.js
// Middleware to validate AI-related requests
const validateAIRequest = (req, res, next) => {
    try {
        // Check if the request body exists
        if (!req.body || typeof req.body !== 'object') {
            console.error('Validation failed: Request body is missing or invalid');
            return res.status(400).json({ message: 'Invalid request body' });
        }

        // Check if the query field exists and is a non-empty string
        if (!req.body.query || typeof req.body.query !== 'string' || req.body.query.trim() === '') {
            console.error('Validation failed: Query is required and must be a non-empty string');
            return res.status(400).json({ message: 'Query is required and must be a non-empty string' });
        }

        // Log the validated query
        console.log(`Validation successful: Query received - "${req.body.query.trim()}"`);

        // Proceed to the next middleware or route handler
        next();
    } catch (error) {
        console.error('Unexpected error during request validation:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = validateAIRequest;

const express = require('express');
const validateAIRequest = require('./middleware/aiMiddleware');

const app = express();
app.use(express.json());

app.post('/ai-endpoint', validateAIRequest, (req, res) => {
    res.json({ message: `Query processed: ${req.body.query}` });
});

app.listen(3000, () => console.log('Server running on port 3000'));