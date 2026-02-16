const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { AppError, asyncHandler } = require('./errorHandler');

/**
 * Protect routes - verify JWT token
 */
const protect = asyncHandler(async (req, res, next) => {
    // Get token from header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        throw new AppError('Not authorized, no token provided', 401);
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from database
        const result = await db.query(
            `SELECT u.*, t.id as tenant_id, t.name as tenant_name 
       FROM users u 
       LEFT JOIN tenants t ON u.tenant_id = t.id 
       WHERE u.id = $1 AND u.status = 'active'`,
            [decoded.id]
        );

        if (result.rows.length === 0) {
            throw new AppError('User not found or inactive', 401);
        }

        // Attach user to request
        req.user = result.rows[0];

        // Super Admin Impersonation Logic
        const tenantOverride = req.headers['x-tenant-id'];
        if (req.user.role === 'admin' && tenantOverride) {
            req.tenantId = parseInt(tenantOverride);
        } else {
            req.tenantId = result.rows[0].tenant_id;

            // Fallback for Super Admin in single-tenant mode
            if (!req.tenantId && process.env.MULTI_TENANT_ENABLED !== 'true') {
                req.tenantId = parseInt(process.env.DEFAULT_TENANT_ID) || 1;
            }
        }

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            throw new AppError('Invalid token', 401);
        }
        if (error.name === 'TokenExpiredError') {
            throw new AppError('Token expired', 401);
        }
        throw error;
    }
});

/**
 * Restrict access to specific roles
 */
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            throw new AppError(`Access denied. Required role: ${roles.join(' or ')}`, 403);
        }
        next();
    };
};

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
};

module.exports = {
    protect,
    restrictTo,
    generateToken,
    generateRefreshToken
};
