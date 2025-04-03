const express = require('express');
const morgan = require('morgan'); // HTTP request logger
const helmet = require('helmet'); // Security headers
const cors = require('cors'); // Cross-Origin Resource Sharing
const dotenv = require('dotenv'); // Environment variables
const rateLimit = require('express-rate-limit'); // Rate limiting
const cookieParser = require('cookie-parser'); // Parse cookies
const connectDB = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const aiRoutes = require('./routes/aiRoutes');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// Load environment variables
dotenv.config();

// Validate required environment variables
if (!process.env.JWT_SECRET || !process.env.MONGO_URI) {
    console.error('⚠️  Missing required environment variables!');
    process.exit(1);
}

const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(helmet());
app.use(cors({ credentials: true, origin: process.env.CLIENT_URL })); // Allow frontend
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Rate Limiting - Prevent API abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/ai', aiRoutes);

// Handle 404 - Route not found
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
