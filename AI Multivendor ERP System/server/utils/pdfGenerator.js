// server/utils/emailService.js
const nodemailer = require('nodemailer');
const validator = require('validator'); // For email validation

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
        // Validate recipient email address
        if (!validator.isEmail(to)) {
            throw new Error('Invalid recipient email address');
        }

        // Check for missing subject or text
        if (!subject || !text) {
            throw new Error('Email subject and text are required');
        }

        // Sending email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            text,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully: ${info.response}`);
    } catch (err) {
        console.error(`Error while sending email: ${err.message}`);
        throw new Error('Failed to send email. Please try again later.');
    }
};

module.exports = { sendEmail };
