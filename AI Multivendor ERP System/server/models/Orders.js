// server/models/Order.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderItemSchema = new Schema({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1']
    },
    price: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative']
    },
    subtotal: {
        type: Number,
        required: true
    }
});

const orderSchema = new Schema({
    orderNumber: {
        type: String,
        unique: true,
        required: true
    },
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [orderItemSchema],
    status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    payment: {
        method: {
            type: String,
            enum: ['credit_card', 'debit_card', 'bank_transfer', 'cash_on_delivery'],
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'refunded'],
            default: 'pending'
        },
        transactionId: String,
        paidAt: Date
    },
    shipping: {
        address: {
            street: {
                type: String,
                required: true
            },
            city: {
                type: String,
                required: true
            },
            state: {
                type: String,
                required: true
            },
            country: {
                type: String,
                required: true
            },
            postalCode: {
                type: String,
                required: true
            }
        },
        method: {
            type: String,
            enum: ['standard', 'express', 'overnight'],
            default: 'standard'
        },
        cost: {
            type: Number,
            required: true,
            default: 0
        },
        trackingNumber: String,
        estimatedDelivery: Date
    },
    subtotal: {
        type: Number,
        required: true,
        min: [0, 'Subtotal cannot be negative']
    },
    tax: {
        type: Number,
        required: true,
        default: 0
    },
    discount: {
        code: String,
        amount: {
            type: Number,
            default: 0
        }
    },
    totalAmount: {
        type: Number,
        required: true,
        min: [0, 'Total amount cannot be negative']
    },
    notes: String,
    statusHistory: [{
        status: {
            type: String,
            enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        note: String
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

// Generate order number before saving
orderSchema.pre('save', async function(next) {
    if (this.isNew) {
        const date = new Date();
        const year = date.getFullYear().toString().substr(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        this.orderNumber = `ORD-${year}${month}-${random}`;
    }
    next();
});

// Calculate totals before saving
orderSchema.pre('save', function(next) {
    // Calculate subtotal
    this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Calculate total amount
    this.totalAmount = this.subtotal + this.shipping.cost + this.tax - this.discount.amount;
    next();
});

// Virtual for order age
orderSchema.virtual('orderAge').get(function() {
    return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Method to update order status
orderSchema.methods.updateStatus = async function(status, note) {
    this.status = status;
    this.statusHistory.push({
        status,
        note,
        timestamp: new Date()
    });
    return await this.save();
};

// Method to add tracking information
orderSchema.methods.addTracking = async function(trackingNumber, estimatedDelivery) {
    this.shipping.trackingNumber = trackingNumber;
    this.shipping.estimatedDelivery = estimatedDelivery;
    this.status = 'shipped';
    return await this.save();
};

// Method to process refund
orderSchema.methods.processRefund = async function(reason) {
    this.status = 'cancelled';
    this.payment.status = 'refunded';
    this.statusHistory.push({
        status: 'cancelled',
        note: `Refund processed: ${reason}`,
        timestamp: new Date()
    });
    return await this.save();
};

// Static method to find recent orders
orderSchema.statics.findRecentOrders = function(days = 7) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return this.find({
        createdAt: { $gte: date }
    })
    .populate('customer')
    .populate('items.product')
    .sort('-createdAt');
};

// Example usage of creating an order
const createOrder = async (orderData) => {
    try {
        const order = new Order({
            customer: orderData.customerId,
            items: orderData.items.map(item => ({
                product: item.productId,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.price * item.quantity
            })),
            payment: {
                method: orderData.paymentMethod
            },
            shipping: {
                address: orderData.shippingAddress,
                method: orderData.shippingMethod,
                cost: orderData.shippingCost
            },
            tax: orderData.tax
        });

        await order.save();
        return order;
    } catch (error) {
        throw error;
    }
};

const Order = mongoose.model('Order', orderSchema);

module.exports = {
    Order,
    createOrder
};
