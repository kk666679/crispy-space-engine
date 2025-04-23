// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { promisify } = require('util');
const redis = require('redis');

class AuthMiddleware {
    constructor() {
        // Validate required environment variables
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET environment variable is not configured');
        }

        this.JWT_SECRET = process.env.JWT_SECRET;
        this.TOKEN_EXPIRATION = process.env.JWT_EXPIRATION || '1h';

        // Initialize Redis client for token blacklisting if Redis URL is provided
        if (process.env.REDIS_URL) {
            this.redisClient = redis.createClient({
                url: process.env.REDIS_URL,
                enable_offline_queue: false
            });

            this.redisClient.on('error', (err) => {
                console.error('Redis client error:', err);
            });

            // Promisify Redis methods
            this.redisGet = promisify(this.redisClient.get).bind(this.redisClient);
            this.redisSet = promisify(this.redisClient.set).bind(this.redisClient);
        }
    }

    /**
     * Rate limiting middleware to prevent brute force attacks
     */
    rateLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: 'Too many requests, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
    });

    /**
     * Validate JWT token
     * @private
     */
    async validateToken(token) {
        try {
            // Check if token is blacklisted (if Redis is configured)
            if (this.redisClient) {
                const isBlacklisted = await this.redisGet(`bl_${token}`);
                if (isBlacklisted) {
                    throw new Error('Token has been revoked');
                }
            }

            // Verify token with strict options
            return jwt.verify(token, this.JWT_SECRET, {
                algorithms: ['HS256'], // Explicitly specify allowed algorithms
                maxAge: this.TOKEN_EXPIRATION
            });
        } catch (error) {
            throw error;
        }
    }

    /**
     * Main authentication middleware
     */
    authenticate = async (req, res, next) => {
        try {
            // Extract and validate Authorization header
            const authHeader = req.header('Authorization');
            if (!authHeader) {
                console.error('Access denied: Authorization header missing');
                return res.status(401).json({
                    status: 'error',
                    message: 'Access denied: No token provided',
                    code: 'NO_TOKEN'
                });
            }

            // Extract and validate token
            const token = authHeader.replace('Bearer ', '');
            if (!token) {
                console.error('Access denied: Token missing in Authorization header');
                return res.status(401).json({
                    status: 'error',
                    message: 'Access denied: Invalid token format',
                    code: 'INVALID_FORMAT'
                });
            }

            // Validate token
            const decoded = await this.validateToken(token);

            // Add user data to request object
            req.user = {
                id: decoded.id,
                role: decoded.role,
                permissions: decoded.permissions || [],
                token
            };

            // Add security headers
            this.addSecurityHeaders(res);

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
                    console.error('Role check failed: No user or role information');
                    return res.status(403).json({
                        status: 'error',
                        message: 'Access forbidden',
                        code: 'NO_ROLE'
                    });
                }

                if (!allowedRoles.includes(req.user.role)) {
                    console.error(`Role check failed: User role ${req.user.role} not allowed`);
                    return res.status(403).json({
                        status: 'error',
                        message: 'Insufficient permissions',
                        code: 'INVALID_ROLE'
                    });
                }

                next();
            } catch (error) {
                console.error('Role check error:', error);
                return res.status(500).json({
                    status: 'error',
                    message: 'Internal server error',
                    code: 'ROLE_CHECK_ERROR'
                });
            }
        };
    };

    /**
     * Add security headers to response
     * @private
     */
    addSecurityHeaders(res) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    /**
     * Handle authentication errors
     * @private
     */
    handleAuthError(error, res) {
        console.error('Authentication error:', error);

        switch (error.name) {
            case 'TokenExpiredError':
                return res.status(401).json({
                    status: 'error',
                    message: 'Token has expired',
                    code: 'TOKEN_EXPIRED'
                });

            case 'JsonWebTokenError':
                return res.status(401).json({
                    status: 'error',
                    message: 'Invalid token',
                    code: 'INVALID_TOKEN'
                });

            case 'Error':
                if (error.message === 'Token has been revoked') {
                    return res.status(401).json({
                        status: 'error',
                        message: 'Token has been revoked',
                        code: 'TOKEN_REVOKED'
                    });
                }
                break;

            default:
                return res.status(500).json({
                    status: 'error',
                    message: 'Internal server error',
                    code: 'AUTH_ERROR'
                });
        }
    }

    /**
     * Revoke a token by adding it to the blacklist
     */
    async revokeToken(token) {
        if (!this.redisClient) {
            throw new Error('Redis is not configured for token blacklisting');
        }

        try {
            // Add token to blacklist with expiration
            await this.redisSet(`bl_${token}`, '1', 'EX', 86400); // 24 hours
            console.log('Token revoked successfully');
        } catch (error) {
            console.error('Error revoking token:', error);
            throw error;
        }
    }
}

// Create and export auth middleware instance
const authMiddleware = new AuthMiddleware();
module.exports = authMiddleware;

// Usage example:
/*
const { authenticate, checkRole } = require('./middleware/authMiddleware');

// Protected route
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
*/
