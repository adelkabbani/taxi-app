const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

/**
 * Request tracing middleware
 * Generates unique request ID for distributed tracing
 */
const requestTracing = (req, res, next) => {
    // Generate or use existing request ID
    const requestId = req.headers['x-request-id'] || uuidv4();

    // Attach to request object
    req.requestId = requestId;

    // Add to response headers
    res.setHeader('X-Request-ID', requestId);

    // Log request start
    logger.info('Incoming request', {
        requestId,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });

    // Track response time
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('Request completed', {
            requestId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`
        });
    });

    next();
};

module.exports = requestTracing;
