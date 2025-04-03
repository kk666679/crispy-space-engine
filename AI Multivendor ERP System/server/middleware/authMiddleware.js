// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader) {
            console.error('Access denied: Authorization header missing');
            return res.status(401).json({ message: 'Access denied: No token provided' });
        }

        const token = authHeader.replace('Bearer ', '');
        if (!token) {
            console.error('Access denied: Token missing in Authorization header');
            return res.status(401).json({ message: 'Access denied: Invalid token format' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            console.error('Token expired:', err);
            return res.status(401).json({ message: 'Token expired' });
        } else if (err.name === 'JsonWebTokenError') {
            console.error('Invalid token:', err);
            return res.status(401).json({ message: 'Invalid token' });
        } else {
            console.error('Authentication error:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
};

module.exports = authenticate;