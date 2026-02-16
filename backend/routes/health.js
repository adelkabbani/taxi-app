const express = require('express');
const db = require('../config/database');
const redis = require('../config/redis');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Basic liveness check
 * @access  Public
 */
router.get('/', (req, res) => {
    res.json({
        success: true,
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

/**
 * @route   GET /api/health/ready
 * @desc    Readiness check (database + redis)
 * @access  Public
 */
router.get('/ready', asyncHandler(async (req, res) => {
    const checks = {
        database: 'unknown',
        redis: 'unknown'
    };

    // Check database
    try {
        await db.raw('SELECT 1');
        checks.database = 'ok';
    } catch (error) {
        checks.database = 'error';
    }

    // Check Redis
    try {
        await redis.ping();
        checks.redis = 'ok';
    } catch (error) {
        checks.redis = 'error';
    }

    const isReady = checks.database === 'ok' && checks.redis === 'ok';

    res.status(isReady ? 200 : 503).json({
        success: isReady,
        status: isReady ? 'ready' : 'not_ready',
        checks,
        timestamp: new Date().toISOString()
    });
}));

/**
 * @route   GET /api/health/metrics
 * @desc    Basic metrics (Prometheus-compatible format available)
 * @access  Public
 */
router.get('/metrics', asyncHandler(async (req, res) => {
    const metrics = {
        uptime_seconds: Math.floor(process.uptime()),
        memory_usage: process.memoryUsage(),
        cpu_usage: process.cpuUsage(),
        timestamp: new Date().toISOString()
    };

    res.json({
        success: true,
        data: metrics
    });
}));

module.exports = router;
