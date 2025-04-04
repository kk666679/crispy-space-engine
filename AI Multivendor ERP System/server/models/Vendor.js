// server/models/Vendor.js
const mongoose = require('mongoose');
const validator = require('validator');

const vendorSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Vendor name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long']
    },
    email: { 
        type: String, 
        required: [true, 'Email address is required'],
        unique: true,
        lowercase: true,
        trim: true,
        validate: [validator.isEmail, 'Please provide a valid email address']
    },
    phone: { 
        type: String, 
        required: [true, 'Phone number is required'],
        validate: {
            validator: function(v) {
                return /^\+?[\d\s-]{10,}$/.test(v);
            },
            message: 'Please provide a valid phone number'
        }
    },
    address: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    taxId: {
        type: String,
        unique: true,
        sparse: true
    },
    rating: {
        type: Number,
        min: [0, 'Rating must be at least 0'],
        max: [5, 'Rating cannot exceed 5'],
        default: 0
    },
    categories: [{
        type: String,
        trim: true
    }]
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index for improved query performance
vendorSchema.index({ email: 1, status: 1 });

// Virtual for full address
vendorSchema.virtual('fullAddress').get(function() {
    const addr = this.address;
    if (!addr) return '';
    return `${addr.street}, ${addr.city}, ${addr.state}, ${addr.country} ${addr.zipCode}`;
});

// Instance method to check if vendor is active
vendorSchema.methods.isActive = function() {
    return this.status === 'active';
};

// Static method to find active vendors
vendorSchema.statics.findActive = function() {
    return this.find({ status: 'active' });
};

// Query middleware to log vendor operations
vendorSchema.pre('save', function(next) {
    if (this.isModified()) {
        console.log(`Vendor ${this.name} is being ${this.isNew ? 'created' : 'updated'}`);
    }
    next();
});

// Custom error handling for duplicate email
vendorSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoError' && error.code === 11000) {
        next(new Error('Email address must be unique'));
    } else {
        next(error);
    }
});

const Vendor = mongoose.model('Vendor', vendorSchema);

module.exports = Vendor;
