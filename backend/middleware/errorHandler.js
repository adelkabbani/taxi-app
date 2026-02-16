const logger = require('../config/logger');
const fs = require('fs');
const path = require('path');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    // WRITE ERROR TO FILE FOR DEBUGGING
    try {
        const errorLog = `
TIMESTAMP: ${new Date().toISOString()}
ERROR: ${err.message}
STACK: ${err.stack}
REQUEST: ${req.method} ${req.path}
BODY: ${JSON.stringify(req.body)}
USER: ${req.user?.id}
----------------------------------------
`;
        fs.appendFileSync(path.join(__dirname, '../latest_error.txt'), errorLog);
    } catch (e) {
        // ignore write error
    }

    // Log error with request context
    logger.error('Error occurred', {
        requestId: req.requestId,
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        userId: req.user?.id
    });

    const statusCode = err.statusCode || err.status || 500;
    let message = err.message || 'Internal server error';

    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
        message = 'An unexpected error occurred';
    }

    res.status(statusCode).json({
        success: false,
        message,
        requestId: req.requestId,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = errorHandler;
module.exports.asyncHandler = asyncHandler;
module.exports.AppError = AppError;
