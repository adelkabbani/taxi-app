const rateLimit = require('express-rate-limit');
const redis = require('../config/redis');

// Global rate limiter
const global = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// Booking creation rate limiter (per phone number)
const bookingCreation = async (req, res, next) => {
    const phone = req.body.passenger_phone || req.user?.phone;

    if (!phone) {
        return next();
    }

    const key = `rate_limit:booking:${phone}`;
    const limit = parseInt(process.env.BOOKING_RATE_LIMIT_PER_PHONE) || 5;
    const windowSeconds = 3600; // 1 hour

    try {
        const current = await redis.incr(key);

        if (current === 1) {
            await redis.expire(key, windowSeconds);
        }

        if (current > limit) {
            return res.status(429).json({
                success: false,
                message: 'Too many bookings from this phone number. Please try again later.'
            });
        }

        next();
    } catch (error) {
        // If Redis fails, allow the request (fail open)
        next();
    }
};

// Auth rate limiter (stricter for login attempts)
const auth = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts
    message: 'Too many login attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Only count failed attempts
});

module.exports = {
    global,
    bookingCreation,
    auth
};
