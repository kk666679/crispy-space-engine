// server/controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { promisify } = require('util');
const crypto = require('crypto');

// Rate limiting configuration
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: { message: 'Too many login attempts. Please try again later.' }
});

// Promisify JWT functions
const signJWT = promisify(jwt.sign);
const verifyJWT = promisify(jwt.verify);

class AuthController {
    constructor() {
        this.login = this.login.bind(this);
        this.refresh = this.refresh.bind(this);
        this.logout = this.logout.bind(this);
        this.forgotPassword = this.forgotPassword.bind(this);
        this.resetPassword = this.resetPassword.bind(this);
    }

    // Generate tokens
    async generateTokens(userId) {
        const accessToken = await signJWT(
            { id: userId },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        const refreshToken = await signJWT(
            { id: userId },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        return { accessToken, refreshToken };
    }

    // Login handler
    async login(req, res) {
        try {
            // Validate input
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: 'error',
                    errors: errors.array()
                });
            }

            const { email, password } = req.body;

            // Find user and select necessary fields
            const user = await User.findOne({ email })
                .select('+password +loginAttempts +lockUntil');

            // Check if user exists
            if (!user) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Invalid credentials'
                });
            }

            // Check account lock
            if (user.isLocked()) {
                return res.status(423).json({
                    status: 'error',
                    message: 'Account is locked. Please try again later.'
                });
            }

            // Compare password
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                // Increment login attempts
                await user.incrementLoginAttempts();
                
                return res.status(401).json({
                    status: 'error',
                    message: 'Invalid credentials'
                });
            }

            // Reset login attempts on successful login
            await user.resetLoginAttempts();

            // Generate tokens
            const { accessToken, refreshToken } = await this.generateTokens(user._id);

            // Update user's last login
            user.lastLogin = Date.now();
            await user.save();

            // Set refresh token in HTTP-only cookie
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            // Send response
            res.json({
                status: 'success',
                data: {
                    accessToken,
                    user: {
                        id: user._id,
                        email: user.email,
                        name: user.name,
                        role: user.role
                    }
                }
            });
        } catch (err) {
            console.error('Login error:', err);
            res.status(500).json({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    // Token refresh handler
    async refresh(req, res) {
        try {
            const { refreshToken } = req.cookies;

            if (!refreshToken) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Refresh token not found'
                });
            }

            // Verify refresh token
            const decoded = await verifyJWT(refreshToken, process.env.JWT_REFRESH_SECRET);
            
            // Generate new tokens
            const { accessToken, refreshToken: newRefreshToken } = 
                await this.generateTokens(decoded.id);

            // Set new refresh token
            res.cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            res.json({
                status: 'success',
                data: { accessToken }
            });
        } catch (err) {
            res.status(401).json({
                status: 'error',
                message: 'Invalid refresh token'
            });
        }
    }

    // Logout handler
    async logout(req, res) {
        try {
            // Clear refresh token cookie
            res.clearCookie('refreshToken');
            
            res.json({
                status: 'success',
                message: 'Successfully logged out'
            });
        } catch (err) {
            res.status(500).json({
                status: 'error',
                message: 'Error during logout'
            });
        }
    }

    // Forgot password handler
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            const user = await User.findOne({ email });
            if (!user) {
                return res.status(404).json({
                    status: 'error',
                    message: 'User not found'
                });
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            user.resetPasswordToken = crypto
                .createHash('sha256')
                .update(resetToken)
                .digest('hex');
            user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes

            await user.save();

            // TODO: Send reset email
            // await sendResetPasswordEmail(user.email, resetToken);

            res.json({
                status: 'success',
                message: 'Password reset instructions sent to email'
            });
        } catch (err) {
            res.status(500).json({
                status: 'error',
                message: 'Error processing password reset'
            });
        }
    }

    // Reset password handler
    async resetPassword(req, res) {
        try {
            const { token, password } = req.body;

            const hashedToken = crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');

            const user = await User.findOne({
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { $gt: Date.now() }
            });

            if (!user) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid or expired reset token'
                });
            }

            // Update password
            user.password = password;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();

            res.json({
                status: 'success',
                message: 'Password successfully reset'
            });
        } catch (err) {
            res.status(500).json({
                status: 'error',
                message: 'Error resetting password'
            });
        }
    }
}

// Export instance
const authController = new AuthController();
module.exports = {
    login: [loginLimiter, authController.login],
    refresh: authController.refresh,
    logout: authController.logout,
    forgotPassword: authController.forgotPassword,
    resetPassword: authController.resetPassword
};
