const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://yourdomain.com' 
    : 'http://localhost:3000'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Basic test route
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// Virtual Assistant class implementation
class VirtualAssistant {
    async processQuery(query) {
        try {
            const response = await this.generateResponse(query);
            return response;
        } catch (error) {
            throw new Error('Error processing query: ' + error.message);
        }
    }

    async generateResponse(query) {
        // Implement your AI response generation logic here
        return {
            text: `Processed query: ${query}`,
            timestamp: new Date().toISOString()
        };
    }
}

// Create instance of Virtual Assistant
const virtualAssistant = new VirtualAssistant();

// Validation middleware
const validateQuery = [
    body('query')
        .trim()
        .notEmpty()
        .withMessage('Query cannot be empty')
        .isString()
        .withMessage('Query must be a string')
        .isLength({ min: 1, max: 1000 })
        .withMessage('Query must be between 1 and 1000 characters')
];

// Request handler
async function handleQuery(req, res) {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array() 
            });
        }

        const { query } = req.body;
        const response = await virtualAssistant.processQuery(query);
        
        res.json({
            success: true,
            response,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Virtual assistant error:', err);
        res.status(500).json({ 
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
}

// Routes
app.post('/api/assistant/query', validateQuery, handleQuery);

// Serve React build files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
  });
}

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});