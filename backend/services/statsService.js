const db = require('../config/database');
const logger = require('../config/logger');
const DocumentService = require('./documentService');

/**
 * Get dashboard statistics for admin
 * @param {number} tenantId - Tenant ID for scoping
 * @returns {Promise<Object>} - Stats object
 */
const getDashboardStats = async (tenantId) => {
    try {
        const onlineDriversQuery = `
            SELECT count(*) as count 
            FROM drivers d
            JOIN users u ON d.user_id = u.id
            WHERE ($1::int IS NULL OR u.tenant_id = $1)
            AND d.availability = 'available'
            AND (d.location_updated_at IS NULL OR d.location_updated_at > NOW() - INTERVAL '5 minutes')
        `;

        const activeTripsQuery = `
            SELECT count(*) as count 
            FROM bookings 
            WHERE ($1::int IS NULL OR tenant_id = $1)
            AND status IN ('assigned', 'accepted', 'arrived', 'waiting_started', 'started')
        `;

        const dailyStatsQuery = `
            SELECT 
                COUNT(*) as total_bookings,
                SUM(CASE WHEN status = 'completed' THEN COALESCE(fare_final, 0) + COALESCE(waiting_fee, 0) ELSE 0 END) as total_revenue
            FROM bookings 
            WHERE ($1::int IS NULL OR tenant_id = $1)
            AND created_at >= NOW() - INTERVAL '24 hours'
        `;

        const partnerBreakdownQuery = `
            SELECT 
                COALESCE(p.name, 'Direct/Manual') as name,
                COUNT(*) as count,
                SUM(CASE WHEN b.status = 'completed' THEN COALESCE(b.fare_final, 0) ELSE 0 END) as revenue
            FROM bookings b
            LEFT JOIN partners p ON b.partner_id = p.id
            WHERE ($1::int IS NULL OR b.tenant_id = $1)
            AND b.created_at >= NOW() - INTERVAL '24 hours'
            GROUP BY p.name
            ORDER BY count DESC
        `;

        const recentActivityQuery = `
            SELECT 
                b.id,
                b.booking_reference,
                b.status,
                b.updated_at,
                COALESCE(b.passenger_name, 'Passenger') as passenger_name,
                p.name as partner_name,
                u_driver.first_name || ' ' || u_driver.last_name as driver_name
            FROM bookings b
            LEFT JOIN partners p ON b.partner_id = p.id
            LEFT JOIN drivers d ON b.driver_id = d.id
            LEFT JOIN users u_driver ON d.user_id = u_driver.id
            WHERE ($1::int IS NULL OR b.tenant_id = $1)
            ORDER BY b.updated_at DESC
            LIMIT 5
        `;

        const revenueTrendQuery = `
            SELECT 
                DATE_TRUNC('hour', updated_at) as hour,
                SUM(COALESCE(fare_final, 0) + COALESCE(waiting_fee, 0)) as revenue
            FROM bookings 
            WHERE ($1::int IS NULL OR tenant_id = $1)
            AND status = 'completed'
            AND updated_at >= NOW() - INTERVAL '24 hours'
            GROUP BY hour
            ORDER BY hour ASC
        `;

        const [onlineRes, activeRes, dailyRes, partnerRes, activityRes, trendRes, documentStats, weeklyRes] = await Promise.all([
            db.query(onlineDriversQuery, [tenantId]),
            db.query(activeTripsQuery, [tenantId]),
            db.query(dailyStatsQuery, [tenantId]),
            db.query(partnerBreakdownQuery, [tenantId]),
            db.query(recentActivityQuery, [tenantId]),
            db.query(revenueTrendQuery, [tenantId]),
            // Fetch document stats and weekly revenue
            DocumentService.getDocumentStats(tenantId),
            db.query(`
                SELECT SUM(COALESCE(fare_final, 0) + COALESCE(waiting_fee, 0)) as total_revenue
                FROM bookings
                WHERE ($1::int IS NULL OR tenant_id = $1)
                AND status = 'completed'
                AND created_at >= NOW() - INTERVAL '7 days'
            `, [tenantId])
        ]);

        return {
            onlineDrivers: parseInt(onlineRes.rows[0].count),
            activeTrips: parseInt(activeRes.rows[0].count),
            todaysBookings: parseInt(dailyRes.rows[0].total_bookings),
            todaysRevenue: parseFloat(dailyRes.rows[0].total_revenue || 0),
            partnerBreakdown: partnerRes.rows.map(r => ({
                name: r.name,
                count: parseInt(r.count),
                revenue: parseFloat(r.revenue || 0)
            })),
            revenueTrend: trendRes.rows.map(r => ({
                hour: r.hour,
                revenue: parseFloat(r.revenue || 0)
            })),
            recentActivity: activityRes.rows,
            // New stats
            documents: {
                pending: documentStats.pending || 0,
                expired: documentStats.expired || 0,
                total: (documentStats.pending || 0) + (documentStats.approved || 0) + (documentStats.rejected || 0) + (documentStats.expired || 0)
            },
            weeklyRevenue: parseFloat(weeklyRes.rows[0]?.total_revenue || 0),
            currency: 'EUR',
            lastUpdated: new Date().toISOString()
        };
    } catch (error) {
        logger.error('Error in statsService.getDashboardStats:', error);
        throw error;
    }
};

/**
 * Get quick stats specifically for the bookings page header
 */
const getBookingQuickStats = async (tenantId) => {
    try {
        const query = `
            SELECT 
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COUNT(*) FILTER (WHERE status IN ('assigned', 'accepted', 'arrived', 'waiting_started', 'started')) as in_progress,
                COUNT(*) FILTER (WHERE status = 'no_show_requested') as no_show_pending
            FROM bookings 
            WHERE ($1::int IS NULL OR tenant_id = $1)
        `;

        const result = await db.query(query, [tenantId]);
        const row = result.rows[0];

        return {
            pending: parseInt(row.pending),
            inProgress: parseInt(row.in_progress),
            noShowPending: parseInt(row.no_show_pending)
        };
    } catch (error) {
        logger.error('Error in statsService.getBookingQuickStats:', error);
        throw error;
    }
};



/**
 * Get comprehensive analytics stats with time range support
 * @param {number} tenantId 
 * @param {string} range 'daily' | 'weekly' | 'monthly'
 */
const getAnalyticsStats = async (tenantId, range = 'daily') => {
    try {
        let timeInterval;
        let groupBy;
        let dateFormat;

        // Define time intervals based on range
        switch (range) {
            case 'daily':
                timeInterval = "INTERVAL '24 hours'";
                groupBy = "DATE_TRUNC('hour', created_at)";
                dateFormat = 'HH24:00';
                break;
            case 'weekly':
                timeInterval = "INTERVAL '7 days'";
                groupBy = "DATE_TRUNC('day', created_at)";
                dateFormat = 'Dy';
                break;
            case 'monthly':
                timeInterval = "INTERVAL '30 days'";
                groupBy = "DATE_TRUNC('day', created_at)";
                dateFormat = 'Mon DD';
                break;
            default:
                timeInterval = "INTERVAL '24 hours'";
                groupBy = "DATE_TRUNC('hour', created_at)";
                dateFormat = 'HH24:00';
        }

        // 1. Summary Cards Query
        const summaryQuery = `
            SELECT 
                COUNT(*) as total_requests,
                COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
                COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
                COUNT(*) FILTER (WHERE status = 'no_show_confirmed') as no_show_bookings,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN COALESCE(fare_final, 0) + COALESCE(waiting_fee, 0) ELSE 0 END), 0) as total_revenue,
                COUNT(DISTINCT passenger_id) as unique_passengers
            FROM bookings
            WHERE ($1::int IS NULL OR tenant_id = $1)
            AND created_at >= NOW() - ${timeInterval}
        `;

        // 2. Performance Trend (Revenue & Bookings over time)
        const trendQuery = `
            SELECT 
                to_char(${groupBy}, '${dateFormat}') as time_label,
                COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN COALESCE(fare_final, 0) + COALESCE(waiting_fee, 0) ELSE 0 END), 0) as revenue
            FROM bookings
            WHERE ($1::int IS NULL OR tenant_id = $1)
            AND created_at >= NOW() - ${timeInterval}
            GROUP BY 1
            ORDER BY 1
        `;

        // 3. Booking Sources (Partners)
        const sourcesQuery = `
            SELECT 
                COALESCE(p.name, 'Manual/Direct') as name,
                COUNT(*) as value
            FROM bookings b
            LEFT JOIN partners p ON b.partner_id = p.id
            WHERE ($1::int IS NULL OR b.tenant_id = $1)
            AND b.created_at >= NOW() - ${timeInterval}
            GROUP BY 1
            ORDER BY 2 DESC
            LIMIT 5
        `;

        // 4. Booking Status Distribution
        const statusQuery = `
            SELECT status as name, COUNT(*) as value
            FROM bookings
            WHERE ($1::int IS NULL OR tenant_id = $1)
            AND created_at >= NOW() - ${timeInterval}
            GROUP BY 1
        `;

        // 5. New Customers (Approximation based on first booking time)
        // This is tricky without a dedicated customers table with 'created_at', 
        // assuming passengers are created with their first booking for now or we query specific new passenger signups if table exists.
        // For now, we'll use unique passengers from summaryQuery as a proxy for "Active Customers" in this period.

        const [summaryRes, trendRes, sourcesRes, statusRes] = await Promise.all([
            db.query(summaryQuery, [tenantId]),
            db.query(trendQuery, [tenantId]),
            db.query(sourcesQuery, [tenantId]),
            db.query(statusQuery, [tenantId])
        ]);

        const summary = summaryRes.rows[0];

        return {
            summary: {
                profit: parseFloat(summary.total_revenue || 0), // Assuming profit ~= revenue for now, unless cost model exists
                requests: parseInt(summary.total_requests || 0),
                completed: parseInt(summary.completed_bookings || 0),
                newCustomers: parseInt(summary.unique_passengers || 0),
                completionRate: summary.total_requests > 0
                    ? Math.round((parseInt(summary.completed_bookings) / parseInt(summary.total_requests)) * 100)
                    : 0
            },
            revenueTrend: trendRes.rows.map(r => ({
                time: r.time_label,
                revenue: parseFloat(r.revenue),
                completed: parseInt(r.completed_count)
            })),
            sources: sourcesRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) })),
            statusDistribution: statusRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) })),
            // Mock ratings for now as ratings table isn't fully utilized yet in queries
            ratings: [
                { name: '5 Stars', value: 45 },
                { name: '4 Stars', value: 10 },
                { name: '3 Stars', value: 2 },
                { name: '2 Stars', value: 1 },
                { name: '1 Star', value: 1 }
            ]
        };

    } catch (error) {
        logger.error('Error in statsService.getAnalyticsStats:', error);
        throw error;
    }
};

module.exports = {
    getDashboardStats,
    getBookingQuickStats,
    getAnalyticsStats
};
