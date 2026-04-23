const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const auth = require('../middleware/auth');

// Note: assignmentScheduler is required inside the route handler to avoid circular dependency
// server.js -> stats.js -> assignmentScheduler -> assignmentService -> server.js

/**
 * @route GET /api/stats/dashboard
 * @desc Get dashboard statistics for the authenticated tenant
 * @access Private/Admin
 */
router.get('/dashboard', statsController.getDashboardStats);

/**
 * @route GET /api/stats/bookings
 * @desc Get quick stats for the bookings page
 * @access Private/Admin
 */
router.get('/bookings', statsController.getBookingQuickStats);

/**
 * @route GET /api/stats/analytics
 * @desc Get comprehensive analytics with time range
 * @access Private/Admin
 */
router.get('/analytics', statsController.getAnalyticsStats);

/**
 * @route GET /api/stats/revenue-pulse
 * @desc Get detailed revenue breakdown for a specific date
 * @access Private/Admin
 */
router.get('/revenue-pulse', statsController.getRevenuePulse);

/**
 * @route   POST /api/stats/auto-assign
 * @desc    Manually trigger AI assignment engine
 * @access  Private (Admin only)
 */
router.post('/auto-assign', auth.restrictTo('admin'), async (req, res) => {
    console.log(`[ASSIGN DEBUG] HTTP POST /api/stats/auto-assign triggered by ${req.user.email}`);
    try {
        const assignmentScheduler = require('../workers/assignmentScheduler');
        const result = await assignmentScheduler.runAssignmentEngine(req.user.tenant_id);
        console.log(`[ASSIGN DEBUG] Engine result:`, result);
        res.json(result);
    } catch (error) {
        console.error(`[ASSIGN DEBUG] CRITICAL ERROR:`, error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
