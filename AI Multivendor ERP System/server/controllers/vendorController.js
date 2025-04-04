// server/controllers/mainController.js
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const { promisify } = require('util');
const crypto = require('crypto');

// Import models
const User = require('../models/User');
const Vendor = require('../models/Vendor');

// Rate limiting configuration
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: 'Too many login attempts. Please try again later.' }
});

// Promisify JWT functions
const signJWT = promisify(jwt.sign);
const verifyJWT = promisify(jwt.verify);

class MainController {
    constructor() {
        // Bind auth methods
        this.login = this.login.bind(this);
        this.refresh = this.refresh.bind(this);
        this.logout = this.logout.bind(this);
        this.forgotPassword = this.forgotPassword.bind(this);
        this.resetPassword = this.resetPassword.bind(this);

        // Bind vendor methods
        this.createVendor = this.createVendor.bind(this);
        this.getVendors = this.getVendors.bind(this);
        this.getVendorById = this.getVendorById.bind(this);
        this.updateVendor = this.updateVendor.bind(this);
        this.deleteVendor = this.deleteVendor.bind(this);
        this.searchVendors = this.searchVendors.bind(this);
    }

    // Helper Methods
    validateRequest(req) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw {
                status: 400,
                errors: errors.array()
            };
        }
    }

    handleError(res, error) {
        console.error('Operation error:', error);
        const status = error.status || 500;
        const message = error.message || 'Internal server error';
        const errors = error.errors || undefined;

        res.status(status).json({
            status: 'error',
            message,
            errors
        });
    }

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

    // Auth Methods
    async login(req, res) {
        try {
            this.validateRequest(req);
            const { email, password } = req.body;

            const user = await User.findOne({ email })
                .select('+password +loginAttempts +lockUntil');

            if (!user || !(await user.comparePassword(password))) {
                if (user) {
                    await user.incrementLoginAttempts();
                }
                return res.status(401).json({
                    status: 'error',
                    message: 'Invalid credentials'
                });
            }

            if (user.isLocked()) {
                return res.status(423).json({
                    status: 'error',
                    message: 'Account is locked. Please try again later.'
                });
            }

            await user.resetLoginAttempts();
            const { accessToken, refreshToken } = await this.generateTokens(user._id);

            user.lastLogin = Date.now();
            await user.save();

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

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
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async refresh(req, res) {
        try {
            const { refreshToken } = req.cookies;

            if (!refreshToken) {
                throw { status: 401, message: 'Refresh token not found' };
            }

            const decoded = await verifyJWT(refreshToken, process.env.JWT_REFRESH_SECRET);
            const { accessToken, refreshToken: newRefreshToken } = 
                await this.generateTokens(decoded.id);

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
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async logout(req, res) {
        try {
            res.clearCookie('refreshToken');
            res.json({
                status: 'success',
                message: 'Successfully logged out'
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            const user = await User.findOne({ email });

            if (!user) {
                throw { status: 404, message: 'User not found' };
            }

            const resetToken = crypto.randomBytes(32).toString('hex');
            user.resetPasswordToken = crypto
                .createHash('sha256')
                .update(resetToken)
                .digest('hex');
            user.resetPasswordExpires = Date.now() + 30 * 60 * 1000;

            await user.save();

            // TODO: Implement email sending
            res.json({
                status: 'success',
                message: 'Password reset instructions sent to email'
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

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
                throw { status: 400, message: 'Invalid or expired reset token' };
            }

            user.password = password;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();

            res.json({
                status: 'success',
                message: 'Password successfully reset'
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    // Vendor Methods
    async createVendor(req, res) {
        try {
            this.validateRequest(req);

            const { 
                name, email, phone, address, taxId,
                businessType, contactPerson, paymentTerms,
                rating, status = 'active'
            } = req.body;

            const existingVendor = await Vendor.findOne({ 
                $or: [{ email }, { taxId }] 
            });

            if (existingVendor) {
                throw {
                    status: 400,
                    message: 'Vendor already exists with this email or tax ID'
                };
            }

            const vendor = new Vendor({
                name, email, phone, address, taxId,
                businessType, contactPerson, paymentTerms,
                rating, status,
                createdBy: req.user._id
            });

            await vendor.save();

            res.status(201).json({
                status: 'success',
                data: vendor
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async getVendors(req, res) {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const skip = (page - 1) * limit;
            const { status, businessType, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

            const query = {};
            if (status) query.status = status;
            if (businessType) query.businessType = businessType;

            const [vendors, total] = await Promise.all([
                Vendor.find(query)
                    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
                    .skip(skip)
                    .limit(limit)
                    .populate('createdBy', 'name email'),
                Vendor.countDocuments(query)
            ]);

            res.json({
                status: 'success',
                data: vendors,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async getVendorById(req, res) {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                throw { status: 400, message: 'Invalid vendor ID' };
            }

            const vendor = await Vendor.findById(id)
                .populate('createdBy', 'name email');

            if (!vendor) {
                throw { status: 404, message: 'Vendor not found' };
            }

            res.json({
                status: 'success',
                data: vendor
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async updateVendor(req, res) {
        try {
            this.validateRequest(req);
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                throw { status: 400, message: 'Invalid vendor ID' };
            }

            const vendor = await Vendor.findByIdAndUpdate(
                id,
                {
                    ...req.body,
                    updatedBy: req.user._id,
                    updatedAt: Date.now()
                },
                { new: true, runValidators: true }
            );

            if (!vendor) {
                throw { status: 404, message: 'Vendor not found' };
            }

            res.json({
                status: 'success',
                data: vendor
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async deleteVendor(req, res) {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                throw { status: 400, message: 'Invalid vendor ID' };
            }

            const vendor = await Vendor.findByIdAndUpdate(
                id,
                {
                    status: 'inactive',
                    deletedBy: req.user._id,
                    deletedAt: Date.now()
                },
                { new: true }
            );

            if (!vendor) {
                throw { status: 404, message: 'Vendor not found' };
            }

            res.json({
                status: 'success',
                message: 'Vendor successfully deactivated'
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async searchVendors(req, res) {
        try {
            const { query } = req.query;
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const skip = (page - 1) * limit;

            const searchQuery = {
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { email: { $regex: query, $options: 'i' } },
                    { 'address.city': { $regex: query, $options: 'i' } },
                    { 'contactPerson.name': { $regex: query, $options: 'i' } }
                ],
                status: { $ne: 'inactive' }
            };

            const [vendors, total] = await Promise.all([
                Vendor.find(searchQuery)
                    .skip(skip)
                    .limit(limit)
                    .sort({ createdAt: -1 }),
                Vendor.countDocuments(searchQuery)
            ]);

            res.json({
                status: 'success',
                data: vendors,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }
}

// Create instance
const mainController = new MainController();

// Export methods with middleware where needed
module.exports = {
    // Auth exports
    login: [loginLimiter, mainController.login],
    refresh: mainController.refresh,
    logout: mainController.logout,
    forgotPassword: mainController.forgotPassword,
    resetPassword: mainController.resetPassword,

    // Vendor exports
    createVendor: mainController.createVendor,
    getVendors: mainController.getVendors,
    getVendorById: mainController.getVendorById,
    updateVendor: mainController.updateVendor,
    deleteVendor: mainController.deleteVendor,
    searchVendors: mainController.searchVendors
};
