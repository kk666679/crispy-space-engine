// server/config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
    const maxRetries = 5; // Maximum number of retries
    const retryDelay = 5000; // Delay between retries in milliseconds
    let retries = maxRetries;

    while (retries > 0) {
        try {
            // Attempt to connect to MongoDB
            await mongoose.connect(process.env.MONGO_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            console.log('MongoDB connected successfully');
            return; // Exit the function on successful connection
        } catch (err) {
            // Log the error with retry information
            console.error(`MongoDB connection error (attempt ${maxRetries - retries + 1} of ${maxRetries}):`, err);

            // Decrement retries and wait before retrying
            retries--;
            if (retries > 0) {
                console.log(`Retrying in ${retryDelay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            } else {
                console.error('All retry attempts failed. Exiting process.');
                process.exit(1); // Exit the process if all retries fail
            }
        }
    }
};

module.exports = connectDB;

// Add the following line to your .env file
// MONGO_URI=mongodb://localhost:27017/your-database-name

const connectDB = require('./config/database');

// Call the function to connect to the database
connectDB();