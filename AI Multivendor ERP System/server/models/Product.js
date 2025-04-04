// server/models/Product.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        minlength: [2, 'Product name must be at least 2 characters long']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    vendor: {
        type: Schema.Types.ObjectId,
        ref: 'Vendor',
        required: [true, 'Vendor is required']
    },
    description: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['Meat', 'Dairy', 'Grocery', 'Beverages', 'Snacks', 'Other']
    },
    sku: {
        type: String,
        unique: true,
        required: [true, 'SKU is required']
    },
    stock: {
        quantity: {
            type: Number,
            default: 0,
            min: [0, 'Stock quantity cannot be negative']
        },
        unit: {
            type: String,
            enum: ['kg', 'g', 'l', 'ml', 'pieces'],
            default: 'pieces'
        },
        lowStockThreshold: {
            type: Number,
            default: 10
        }
    },
    images: [{
        url: String,
        altText: String
    }],
    // Halal certification details
    halal: {
        isHalalCertified: {
            type: Boolean,
            default: false
        },
        certificateNumber: {
            type: String,
            required: function() { return this.halal.isHalalCertified; }
        },
        certificationAuthority: {
            type: String,
            required: function() { return this.halal.isHalalCertified; }
        },
        ingredients: [{
            type: String,
            trim: true
        }],
        complianceDate: {
            type: Date,
            required: function() { return this.halal.isHalalCertified; }
        },
        expiryDate: {
            type: Date,
            required: function() { return this.halal.isHalalCertified; }
        }
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'outOfStock'],
        default: 'active'
    },
    ratings: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        count: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
productSchema.index({ name: 1 });
productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ 'halal.isHalalCertified': 1 });
productSchema.index({ category: 1, status: 1 });

// Virtual for checking if product is low on stock
productSchema.virtual('isLowStock').get(function() {
    return this.stock.quantity <= this.stock.lowStockThreshold;
});

// Pre-save middleware to generate SKU if not provided
productSchema.pre('save', async function(next) {
    if (!this.sku) {
        const prefix = this.category.substring(0, 3).toUpperCase();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        this.sku = `${prefix}${random}`;
    }
    next();
});

// Method to update stock
productSchema.methods.updateStock = async function(quantity) {
    this.stock.quantity += quantity;
    if (this.stock.quantity <= 0) {
        this.status = 'outOfStock';
    } else if (this.status === 'outOfStock') {
        this.status = 'active';
    }
    return await this.save();
};

// Method to add rating
productSchema.methods.addRating = async function(rating) {
    const oldTotal = this.ratings.average * this.ratings.count;
    this.ratings.count += 1;
    this.ratings.average = (oldTotal + rating) / this.ratings.count;
    return await this.save();
};

// Static method to find active halal products
productSchema.statics.findHalalProducts = function() {
    return this.find({
        'halal.isHalalCertified': true,
        status: 'active'
    }).populate('vendor');
};

// Example of creating a halal product
const createHalalProduct = async (productData) => {
    try {
        const newHalalProduct = new Product({
            name: productData.name,
            price: productData.price,
            vendor: productData.vendorId,
            category: productData.category,
            description: productData.description,
            stock: {
                quantity: productData.quantity,
                unit: productData.unit
            },
            halal: {
                isHalalCertified: true,
                certificateNumber: productData.halalCertificateNumber,
                certificationAuthority: productData.halalCertificationAuthority,
                ingredients: productData.ingredients,
                complianceDate: new Date(),
                expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
            }
        });

        await newHalalProduct.save();
        console.log('Halal product created successfully:', newHalalProduct);
        return newHalalProduct;
    } catch (error) {
        console.error('Error creating halal product:', error);
        throw error;
    }
};

const Product = mongoose.model('Product', productSchema);

module.exports = {
    Product,
    createHalalProduct
};
