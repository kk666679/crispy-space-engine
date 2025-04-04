// server/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        validate: [validator.isEmail, 'Please provide a valid email address']
    },
    password: { 
        type: String, 
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long'],
        select: false // Don't include password by default in queries
    },
    firstName: {
        type: String,
        trim: true,
        required: [true, 'First name is required']
    },
    lastName: {
        type: String,
        trim: true,
        required: [true, 'Last name is required']
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'manager'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ passwordResetToken: 1, passwordResetExpires: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified or is new
    if (!this.isModified('password')) return next();
    
    try {
        // Generate salt and hash password
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        
        // If this is a password change, update passwordChangedAt
        if (!this.isNew) {
            this.passwordChangedAt = Date.now();
        }
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Password comparison failed');
    }
};

// Method to check if password was changed after a given timestamp
userSchema.methods.passwordChangedAfter = function(timestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return timestamp < changedTimestamp;
    }
    return false;
};

// Method to create password reset token
userSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    return resetToken;
};

// Method to handle failed login attempts
userSchema.methods.incrementLoginAttempts = async function() {
    // Lock account if max attempts reached
    if (this.loginAttempts + 1 >= 5) {
        const lockTime = 1 * 60 * 60 * 1000; // 1 hour lock
        this.lockUntil = Date.now() + lockTime;
    }
    
    this.loginAttempts += 1;
    return await this.save();
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = async function() {
    this.loginAttempts = 0;
    this.lockUntil = undefined;
    return await this.save();
};

// Static method to find active users
userSchema.statics.findActive = function() {
    return this.find({ isActive: true });
};

// Middleware to handle duplicate email errors
userSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoError' && error.code === 11000) {
        next(new Error('Email address is already registered'));
    } else {
        next(error);
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
