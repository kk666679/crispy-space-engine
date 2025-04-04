// server/utils/emailService.js
const nodemailer = require('nodemailer');
const validator = require('validator');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            pool: true, // Use pooled connections
            maxConnections: 5,
            maxMessages: 100,
            rateDelta: 1000,
            rateLimit: 5, // Limit to 5 emails per second
        });

        // Initialize template cache
        this.templateCache = new Map();
    }

    /**
     * Load and compile email template
     * @param {string} templateName - Name of the template file
     * @returns {Promise<Function>} Compiled template function
     */
    async loadTemplate(templateName) {
        try {
            // Check cache first
            if (this.templateCache.has(templateName)) {
                return this.templateCache.get(templateName);
            }

            const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.hbs`);
            const templateContent = await fs.readFile(templatePath, 'utf-8');
            const template = handlebars.compile(templateContent);
            
            // Cache the template
            this.templateCache.set(templateName, template);
            
            return template;
        } catch (error) {
            throw new Error(`Failed to load email template: ${templateName}`);
        }
    }

    /**
     * Validate email parameters
     * @param {Object} params - Email parameters
     * @returns {void}
     * @throws {Error} If validation fails
     */
    validateEmailParams({ to, subject, text, html }) {
        if (!to || !Array.isArray(to) && !validator.isEmail(to)) {
            throw new Error('Invalid recipient email address');
        }

        if (Array.isArray(to) && !to.every(email => validator.isEmail(email))) {
            throw new Error('Invalid recipient email addresses in array');
        }

        if (!subject?.trim()) {
            throw new Error('Email subject is required');
        }

        if (!text?.trim() && !html?.trim()) {
            throw new Error('Email content (text or HTML) is required');
        }
    }

    /**
     * Send an email
     * @param {Object} options - Email options
     * @param {string|string[]} options.to - Recipient email address(es)
     * @param {string} options.subject - Email subject
     * @param {string} [options.text] - Plain text content
     * @param {string} [options.html] - HTML content
     * @param {Object[]} [options.attachments] - Email attachments
     * @param {Object} [options.cc] - CC recipients
     * @param {Object} [options.bcc] - BCC recipients
     * @returns {Promise<Object>} Send result
     */
    async sendEmail({ to, subject, text, html, attachments, cc, bcc }) {
        try {
            this.validateEmailParams({ to, subject, text, html });

            const mailOptions = {
                from: `"${process.env.EMAIL_SENDER_NAME}" <${process.env.EMAIL_USER}>`,
                to: Array.isArray(to) ? to.join(',') : to,
                subject,
                text,
                html,
                attachments,
                cc,
                bcc,
                headers: {
                    'X-Priority': 'high'
                }
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log(`Email sent successfully: ${info.messageId}`);
            return info;
        } catch (error) {
            console.error('Email sending error:', error);
            throw new Error('Failed to send email. Please try again later.');
        }
    }

    /**
     * Send a template-based email
     * @param {Object} options - Email options
     * @param {string} options.template - Template name
     * @param {Object} options.data - Template data
     * @returns {Promise<Object>} Send result
     */
    async sendTemplateEmail({ to, subject, template, data, attachments }) {
        try {
            const compiledTemplate = await this.loadTemplate(template);
            const html = compiledTemplate(data);

            return await this.sendEmail({
                to,
                subject,
                html,
                attachments
            });
        } catch (error) {
            console.error('Template email error:', error);
            throw new Error('Failed to send template email');
        }
    }

    /**
     * Send bulk emails
     * @param {Object[]} emailList - List of email objects
     * @returns {Promise<Object[]>} Array of send results
     */
    async sendBulkEmails(emailList) {
        try {
            const results = await Promise.allSettled(
                emailList.map(emailData => this.sendEmail(emailData))
            );

            const failed = results.filter(result => result.status === 'rejected');
            if (failed.length > 0) {
                console.error(`${failed.length} emails failed to send`);
            }

            return results;
        } catch (error) {
            console.error('Bulk email error:', error);
            throw new Error('Failed to send bulk emails');
        }
    }

    /**
     * Send a verification email
     * @param {string} to - Recipient email
     * @param {string} verificationToken - Verification token
     * @returns {Promise<Object>} Send result
     */
    async sendVerificationEmail(to, verificationToken) {
        return this.sendTemplateEmail({
            to,
            subject: 'Verify Your Email Address',
            template: 'verification',
            data: {
                verificationLink: `${process.env.APP_URL}/verify/${verificationToken}`,
                userName: to.split('@')[0]
            }
        });
    }

    /**
     * Send a password reset email
     * @param {string} to - Recipient email
     * @param {string} resetToken - Reset token
     * @returns {Promise<Object>} Send result
     */
    async sendPasswordResetEmail(to, resetToken) {
        return this.sendTemplateEmail({
            to,
            subject: 'Password Reset Request',
            template: 'password-reset',
            data: {
                resetLink: `${process.env.APP_URL}/reset-password/${resetToken}`,
                userName: to.split('@')[0]
            }
        });
    }
}

// Create and export singleton instance
const emailService = new EmailService();
module.exports = emailService;
