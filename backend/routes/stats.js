const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const auth = require('../middleware/auth');

/**
 * @route GET /api/stats/dashboard
 * @desc Get dashboard statistics for the authenticated tenant
 * @access Private/Admin
 */
router.get('/dashboard', auth.protect, statsController.getDashboardStats);

/**
 * @route GET /api/stats/bookings
 * @desc Get quick stats for the bookings page
 * @access Private/Admin
 */
router.get('/bookings', auth.protect, statsController.getBookingQuickStats);

/**
 * @route GET /api/stats/analytics
 * @desc Get comprehensive analytics with time range
 * @access Private/Admin
 */
router.get('/analytics', auth.protect, statsController.getAnalyticsStats);

module.exports = router;
