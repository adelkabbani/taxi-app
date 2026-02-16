const statsService = require('../services/statsService');
const logger = require('../config/logger');

/**
 * Get dashboard stats for the authenticated tenant
 */
const getDashboardStats = async (req, res) => {
    try {
        // tenant_id can be null for Super Admin (view all)
        const tenantId = req.user.tenant_id || null;

        const stats = await statsService.getDashboardStats(tenantId);
        res.json(stats);
    } catch (error) {
        logger.error('Error in statsController.getDashboardStats:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch dashboard statistics'
        });
    }
};

const getBookingQuickStats = async (req, res) => {
    try {
        // tenant_id can be null for Super Admin (view all)
        const tenantId = req.user.tenant_id || null;

        const stats = await statsService.getBookingQuickStats(tenantId);
        res.json(stats);
    } catch (error) {
        logger.error('Error in statsController.getBookingQuickStats:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch booking statistics'
        });
    }
};

const getAnalyticsStats = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id || null;
        const range = req.query.range || 'daily';

        const stats = await statsService.getAnalyticsStats(tenantId, range);
        res.json(stats);
    } catch (error) {
        logger.error('Error in statsController.getAnalyticsStats:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch analytics'
        });
    }
};

module.exports = {
    getDashboardStats,
    getBookingQuickStats,
    getAnalyticsStats
};
