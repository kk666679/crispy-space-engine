// server/utils/emailService.js
const nodemailer = require('nodemailer');
const validator = require('validator'); // To validate email addresses

// Configure the transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Send an email
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Email body (plain text)
 * @throws Will throw an error if email validation fails or sending fails
 */
const sendEmail = async (to, subject, text) => {
    try {
        // Validate email address
        if (!validator.isEmail(to)) {
            throw new Error('Invalid email address');
        }

        // Validate subject and text
        if (!subject || !text) {
            throw new Error('Subject and text cannot be empty');
        }

        // Sending email
        await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text });
        console.log(`Email sent successfully to ${to}`);
    } catch (err) {
        console.error('Error sending email:', err.message);
        throw new Error('Email sending failed. Please try again later.');
    }
};

module.exports = { sendEmail };
