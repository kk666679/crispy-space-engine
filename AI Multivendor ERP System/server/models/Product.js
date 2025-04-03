// server/models/Product.js
const Product = require('./models/Product');

const createHalalProduct = async () => {
    try {
        const newHalalProduct = new Product({
            name: 'Halal Chicken',
            price: 15.99,
            vendor: 'VendorObjectIdHere', // Replace with actual vendor's ObjectId
            isHalalCertified: true,  // Mark it as halal-certified
            halalCertificateNumber: 'HC12345',  // Halal certificate number
            halalCertificationAuthority: 'Halal Certification Organization', // The authority that issued the certificate
            halalIngredients: ['Chicken', 'Salt', 'Spices'],  // List halal ingredients
            halalComplianceDate: new Date(),  // Date of certification
        });

        await newHalalProduct.save();
        console.log('Halal product created successfully:', newHalalProduct);
    } catch (error) {
        console.error('Error creating halal product:', error);
    }
};

createHalalProduct();
