// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger'); // Assume we have a logging utility
const { promisify } = require('util');
const redis = require('redis'); // For token blacklisting
const rateLimit = require('express-rate-limit');

class AuthMiddleware {
    constructor() {
        // Validate required environment variables
        const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'REDIS_URL'];
        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                throw new Error(`${envVar} environment variable is not configured`);
            }
        }

        this.JWT_SECRET = process.env.JWT_SECRET;
        this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
        
        // Initialize Redis client for token blacklisting
        this.redisClient = redis.createClient({
            url: process.env.REDIS_URL,
            enable_offline_queue: false
        });

        this.redisClient.on('error', (err) => {
            logger.error('Redis client error:', err);
        });

        // Promisify Redis methods
        this.redisGet = promisify(this.redisClient.get).bind(this.redisClient);
        this.redisSet = promisify(this.redisClient.set).bind(this.redisClient);

        // Bind methods
        this.authenticate = this.authenticate.bind(this);
        this.checkRole = this.checkRole.bind(this);
        this.validateToken = this.validateToken.bind(this);
    }

    /**
     * Rate limiting middleware
     */
    rateLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
    });

    /**
     * Validate JWT token
     * @private
     */
    async validateToken(token) {
        try {
            // Check if token is blacklisted
            const isBlacklisted = await this.redisGet(`bl_${token}`);
            if (isBlacklisted) {
                throw new Error('Token has been revoked');
            }

            // Verify token
            const decoded = jwt.verify(token, this.JWT_SECRET, {
                algorithms: ['HS256'], // Explicitly specify allowed algorithms
                maxAge: process.env.JWT_EXPIRATION || '1h' // Token expiration
            });

            return decoded;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Main authentication middleware
     */
    authenticate = async (req, res, next) => {
        try {
            // Extract token from headers
            const authHeader = req.header('Authorization');
            if (!authHeader) {
                logger.warn('Authentication failed: Missing Authorization header');
                return res.status(401).json({
                    status: 'error',
                    message: 'Authentication required'
                });
            }

            // Validate token format
            const token = authHeader.replace('Bearer ', '');
            if (!token) {
                logger.warn('Authentication failed: Invalid token format');
                return res.status(401).json({
                    status: 'error',
                    message: 'Invalid token format'
                });
            }

            // Validate token
            const decoded = await this.validateToken(token);

            // Add user data to request
            req.user = {
                id: decoded.id,
                role: decoded.role,
                permissions: decoded.permissions || [],
                token
            };

            // Add security headers
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');

            next();
        } catch (error) {
            this.handleAuthError(error, res);
        }
    };

    /**
     * Role-based access control middleware
     */
    checkRole = (allowedRoles) => {
        return (req, res, next) => {
            try {
                if (!req.user || !req.user.role) {
                    logger.warn('Role check failed: No user or role information');
                    return res.status(403).json({
                        status: 'error',
                        message: 'Access forbidden'
                    });
                }

                if (!allowedRoles.includes(req.user.role)) {
                    logger.warn(`Role check failed: User role ${req.user.role} not in allowed roles`);
                    return res.status(403).json({
                        status: 'error',
                        message: 'Insufficient permissions'
                    });
                }

                next();
            } catch (error) {
                logger.error('Role check error:', error);
                return res.status(500).json({
                    status: 'error',
                    message: 'Internal server error'
                });
            }
        };
    };

    /**
     * Permission-based access control middleware
     */
    checkPermission = (requiredPermission) => {
        return (req, res, next) => {
            try {
                if (!req.user || !req.user.permissions) {
                    logger.warn('Permission check failed: No user or permission information');
                    return res.status(403).json({
                        status: 'error',
                        message: 'Access forbidden'
                    });
                }

                if (!req.user.permissions.includes(requiredPermission)) {
                    logger.warn(`Permission check failed: User lacks permission ${requiredPermission}`);
                    return res.status(403).json({
                        status: 'error',
                        message: 'Insufficient permissions'
                    });
                }

                next();
            } catch (error) {
                logger.error('Permission check error:', error);
                return res.status(500).json({
                    status: 'error',
                    message: 'Internal server error'
                });
            }
        };
    };

    /**
     * Handle authentication errors
     * @private
     */
    handleAuthError(error, res) {
        logger.error('Authentication error:', error);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                status: 'error',
                message: 'Token has expired',
                code: 'TOKEN_EXPIRED'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }

        if (error.message === 'Token has been revoked') {
            return res.status(401).json({
                status: 'error',
                message: 'Token has been revoked',
                code: 'TOKEN_REVOKED'
            });
        }

        return res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }

    /**
     * Revoke a token
     */
    async revokeToken(token) {
        try {
            // Add token to blacklist with expiration
            await this.redisSet(`bl_${token}`, '1', 'EX', 86400); // 24 hours
            logger.info('Token revoked successfully');
        } catch (error) {
            logger.error('Error revoking token:', error);
            throw error;
        }
    }
}

// Create and export auth middleware instance
const authMiddleware = new AuthMiddleware();
module.exports = authMiddleware;

// Usage example:
/*
const { authenticate, checkRole, checkPermission } = require('./middleware/authMiddleware');

// Protected route with authentication
app.get('/api/protected',
    authenticate,
    (req, res) => {
        res.json({ message: 'Protected route accessed successfully' });
    }
);

// Admin-only route
app.post('/api/admin',
    authenticate,
    checkRole(['admin']),
    (req, res) => {
        res.json({ message: 'Admin route accessed successfully' });
    }
);

// Route requiring specific permission
app.put('/api/users',
    authenticate,
    checkPermission('user:update'),
    (req, res) => {
        res.json({ message: 'User updated successfully' });
    }
);
*/
