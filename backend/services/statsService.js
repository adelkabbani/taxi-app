const db = require('../config/database');
const logger = require('../config/logger');
const DocumentService = require('./documentService');
const { getOperationalDayStart, getOperationalDayEnd } = require('../utils/timeUtils');

/**
 * Get dashboard statistics for admin
 * @param {number} tenantId - Tenant ID for scoping
 * @returns {Promise<Object>} - Stats object
 */
const getDashboardStats = async (tenantId, startDate, endDate) => {
    try {
        const parseDate = (d, fallback) => {
            if (!d) return fallback();
            const date = new Date(d);
            return isNaN(date.getTime()) ? fallback() : date;
        };

        const opStart = parseDate(startDate, getOperationalDayStart);
        const opEnd = parseDate(endDate, getOperationalDayEnd);

        const onlineDriversQuery = `
            SELECT count(*) as count 
            FROM drivers d
            JOIN users u ON d.user_id = u.id
            WHERE (($1::int IS NULL AND u.tenant_id IS NOT NULL) OR u.tenant_id = $1)
            AND d.availability = 'available'
            AND (d.location_updated_at IS NULL OR d.location_updated_at > NOW() - INTERVAL '5 minutes')
        `;

        const activeTripsQuery = `
            SELECT count(*) as count 
            FROM bookings 
            WHERE (($1::int IS NULL AND tenant_id IS NOT NULL) OR tenant_id = $1)
            AND status IN ('assigned', 'accepted', 'arrived', 'waiting_started', 'started')
        `;

        const dailyStatsQuery = `
            SELECT 
                COUNT(*) as total_bookings,
                -- Confirmed revenue (completed bookings)
                COALESCE(SUM(CASE WHEN status = 'completed' THEN COALESCE(fare_final, 0) + COALESCE(waiting_fee, 0) ELSE 0 END), 0) as confirmed_revenue,
                -- Projected revenue (pending + assigned + accepted + in-progress)
                COALESCE(SUM(CASE WHEN status IN ('pending','assigned','accepted','arrived','waiting_started','started') THEN COALESCE(fare_final, fare_estimate, 0) + COALESCE(waiting_fee, 0) ELSE 0 END), 0) as projected_revenue,
                -- Total (confirmed + projected)
                COALESCE(SUM(CASE WHEN status IN ('completed','pending','assigned','accepted','arrived','waiting_started','started') THEN COALESCE(fare_final, fare_estimate, 0) + COALESCE(waiting_fee, 0) ELSE 0 END), 0) as total_revenue
            FROM bookings 
            WHERE (($1::int IS NULL AND tenant_id IS NOT NULL) OR tenant_id = $1)
            AND scheduled_pickup_time >= $2 AND scheduled_pickup_time <= $3
        `;

        const partnerBreakdownQuery = `
            SELECT 
                COALESCE(p.name, 'Direct/Manual') as name,
                COUNT(*) as count,
                SUM(CASE WHEN b.status = 'completed' THEN COALESCE(b.fare_final, 0) ELSE 0 END) as revenue
            FROM bookings b
            LEFT JOIN partners p ON b.partner_id = p.id
            WHERE (($1::int IS NULL AND b.tenant_id IS NOT NULL) OR b.tenant_id = $1)
            AND b.scheduled_pickup_time >= $2 AND b.scheduled_pickup_time <= $3
            GROUP BY p.name
            ORDER BY count DESC
            LIMIT 10
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
            WHERE (($1::int IS NULL AND b.tenant_id IS NOT NULL) OR b.tenant_id = $1)
            ORDER BY b.updated_at DESC
            LIMIT 5
        `;

        const revenueTrendQuery = `
            SELECT 
                DATE_TRUNC('hour', scheduled_pickup_time) as hour,
                SUM(COALESCE(fare_final, 0) + COALESCE(waiting_fee, 0)) as revenue
            FROM bookings 
            WHERE (($1::int IS NULL AND tenant_id IS NOT NULL) OR tenant_id = $1)
            AND status = 'completed'
            AND scheduled_pickup_time >= $2 AND scheduled_pickup_time <= $3
            GROUP BY hour
            ORDER BY hour ASC
        `;

        // Status Breakdown for Pie Chart (Assigned, Pending, Quarantined)
        const statusBreakdownQuery = `
            SELECT 
                CASE 
                    WHEN status IN ('assigned','accepted','arrived','waiting_started','started') THEN 'Assigned'
                    WHEN status = 'pending' THEN 'Pending'
                    WHEN status = 'needs_review_price' THEN 'Quarantined'
                    ELSE 'Other'
                END as sector,
                COUNT(*) as count
            FROM bookings
            WHERE (($1::int IS NULL AND tenant_id IS NOT NULL) OR tenant_id = $1)
            AND scheduled_pickup_time >= $2 AND scheduled_pickup_time <= $3
            GROUP BY 1
        `;

        const [onlineRes, activeRes, dailyRes, partnerRes, activityRes, trendRes, documentStats, weeklyRes, statusRes] = await Promise.all([
            db.query(onlineDriversQuery, [tenantId]),
            db.query(activeTripsQuery, [tenantId]),
            db.query(dailyStatsQuery, [tenantId, opStart, opEnd]),
            db.query(partnerBreakdownQuery, [tenantId, opStart, opEnd]),
            db.query(recentActivityQuery, [tenantId]),
            db.query(`
                SELECT 
                    DATE_TRUNC('hour', scheduled_pickup_time) as hour,
                    SUM(COALESCE(fare_final, fare_estimate, 0) + COALESCE(waiting_fee, 0)) as revenue
                FROM bookings 
                WHERE (($1::int IS NULL AND tenant_id IS NOT NULL) OR tenant_id = $1)
                AND status IN ('pending', 'assigned', 'accepted', 'completed', 'arrived', 'started')
                AND scheduled_pickup_time >= $2 AND scheduled_pickup_time <= $3
                GROUP BY 1
                ORDER BY hour ASC
            `, [tenantId, opStart, opEnd]), 
            DocumentService.getDocumentStats(tenantId),
            db.query(`
                SELECT SUM(COALESCE(fare_final, fare_estimate, 0) + COALESCE(waiting_fee, 0)) as total_revenue
                FROM bookings
                WHERE (($1::int IS NULL AND tenant_id IS NOT NULL) OR tenant_id = $1)
                AND status IN ('completed','assigned','accepted','pending','started')
                AND created_at >= NOW() - INTERVAL '7 days'
            `, [tenantId]),
            db.query(statusBreakdownQuery, [tenantId, opStart, opEnd])
        ]);

        const statusBreakdown = (statusRes?.rows || []).map(r => ({ name: r.sector, value: parseInt(r.count) }));

        return {
            onlineDrivers: parseInt(onlineRes?.rows[0]?.count || 0),
            activeTrips: parseInt(activeRes?.rows[0]?.count || 0),
            todaysBookings: parseInt(dailyRes?.rows[0]?.total_bookings || 0),
            todaysRevenue: parseFloat(dailyRes?.rows[0]?.total_revenue || 0),
            confirmedRevenue: parseFloat(dailyRes?.rows[0]?.confirmed_revenue || 0),
            projectedRevenue: parseFloat(dailyRes?.rows[0]?.projected_revenue || 0),
            statusBreakdown, // Added for Sector Chart
            partnerBreakdown: (partnerRes?.rows || []).map(r => ({
                name: r.name,
                count: parseInt(r.count),
                revenue: parseFloat(r.revenue || 0)
            })),
            revenueTrend: (trendRes?.rows || []).map(r => ({
                hour: r.hour,
                revenue: parseFloat(r.revenue || 0)
            })),
            recentActivity: activityRes?.rows || [],
            documents: {
                pending: documentStats?.pending || 0,
                expired: documentStats?.expired || 0,
                total: (documentStats?.pending || 0) + (documentStats?.approved || 0) + (documentStats?.rejected || 0) + (documentStats?.expired || 0)
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
                -- Pending EXCLUDES quarantined (needs_review_price)
                COUNT(*) FILTER (WHERE status IN ('pending', 'rejected', 'assigned')
                    AND status != 'needs_review_price') as pending,
                COUNT(*) FILTER (WHERE status IN ('accepted', 'arrived', 'waiting_started', 'started')) as in_progress,
                COUNT(*) FILTER (WHERE status = 'no_show_requested') as no_show_pending,
                COUNT(*) FILTER (WHERE status = 'needs_review_price') as quarantined
            FROM bookings 
            WHERE (($1::int IS NULL AND tenant_id IS NOT NULL) OR tenant_id = $1)
            AND scheduled_pickup_time >= $2
        `;

        const opStart = getOperationalDayStart();
        const opEnd = getOperationalDayEnd();
        const result = await db.query(query, [tenantId, opStart]);
        const row = result.rows[0];

        return {
            pending: parseInt(row.pending),
            inProgress: parseInt(row.in_progress),
            noShowPending: parseInt(row.no_show_pending),
            quarantined: parseInt(row.quarantined)
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
        let customStartTime;
        let customEndTime;

        // Define time intervals based on range
        switch (range) {
            case 'daily':
                timeInterval = "INTERVAL '24 hours'"; // Still 24h for trend shape
                groupBy = "DATE_TRUNC('hour', scheduled_pickup_time)";
                dateFormat = 'HH24:00';
                customStartTime = getOperationalDayStart();
                customEndTime = getOperationalDayEnd();
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

        const effectiveStartTime = customStartTime || (range === 'weekly' ? new Date(Date.now() - 7*24*3600*1000) : (range === 'monthly' ? new Date(Date.now() - 30*24*3600*1000) : new Date(Date.now() - 24*3600*1000)));
        const effectiveEndTime = customEndTime || getOperationalDayEnd(new Date(new Date(effectiveStartTime).getTime() + (range === 'weekly' ? 7*24*3600*1000 : 30*24*3600*1000)));

            // Summary Cards Query
            const summaryQuery = `
                SELECT 
                    COUNT(*) as total_requests,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
                    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
                    COUNT(*) FILTER (WHERE status = 'expired') as expired_bookings,
                    COUNT(*) FILTER (WHERE status = 'no_show_confirmed') as no_show_bookings,
                    COALESCE(SUM(CASE WHEN status IN ('completed','pending','assigned','accepted','arrived','waiting_started','started') THEN COALESCE(fare_final, fare_estimate, 0) + COALESCE(waiting_fee, 0) ELSE 0 END), 0) as total_revenue,
                    COUNT(DISTINCT passenger_id) as unique_passengers
                FROM bookings
                WHERE (($1::int IS NULL AND tenant_id IS NOT NULL) OR tenant_id = $1)
                AND scheduled_pickup_time >= $2 AND scheduled_pickup_time <= $3
            `;

            const [summaryRes, trendRes, sourcesRes, statusRes] = await Promise.all([
                db.query(summaryQuery, [tenantId, effectiveStartTime, effectiveEndTime]),
                db.query(trendQuery, [tenantId, effectiveStartTime, effectiveEndTime]),
                db.query(sourcesQuery, [tenantId, effectiveStartTime, effectiveEndTime]),
                db.query(statusQuery, [tenantId, effectiveStartTime, effectiveEndTime])
            ]);

            const summary = summaryRes.rows[0];

            return {
                summary: {
                    profit: parseFloat(summary?.total_revenue || 0),
                    requests: parseInt(summary?.total_requests || 0),
                    completed: parseInt(summary?.completed_bookings || 0),
                    newCustomers: parseInt(summary?.unique_passengers || 0),
                    completionRate: (summary?.total_requests || 0) > 0
                        ? Math.round((parseInt(summary.completed_bookings) / parseInt(summary.total_requests)) * 100)
                        : 0
                },
                revenueTrend: (trendRes?.rows || []).map(r => ({
                    time: r.time_label,
                    revenue: parseFloat(r.revenue || 0),
                    completed: parseInt(r.completed_count || 0)
                })),
                sources: (sourcesRes?.rows || []).map(r => ({ name: r.name, value: parseInt(r.value || 0) })),
                statusDistribution: (statusRes?.rows || []).map(r => ({ name: r.name, value: parseInt(r.value || 0) })),
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

/**
 * Get revenue results for a specific day with source breakdown
 * @param {number} tenantId 
 * @param {string} date YYYY-MM-DD
 */
const getRevenuePulse = async (tenantId, date) => {
    try {
        const startTime = `${date} 00:00:00`;
        const endTime = `${date} 23:59:59`;

        // 1. Total Volume & Aggregate Stats for the Day
        const aggregateQuery = `
            SELECT 
                COUNT(*) as total_bookings,
                COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
                -- Confirmed revenue from completed rides
                COALESCE(SUM(CASE WHEN status = 'completed' THEN COALESCE(fare_final, 0) + COALESCE(waiting_fee, 0) ELSE 0 END), 0) as confirmed_revenue,
                -- Projected revenue from active/assigned/pending rides
                COALESCE(SUM(CASE WHEN status IN ('pending','assigned','accepted','arrived','waiting_started','started') THEN COALESCE(fare_final, fare_estimate, 0) + COALESCE(waiting_fee, 0) ELSE 0 END), 0) as projected_revenue,
                -- Total = confirmed + projected
                COALESCE(SUM(CASE WHEN status IN ('completed','pending','assigned','accepted','arrived','waiting_started','started') THEN COALESCE(fare_final, fare_estimate, 0) + COALESCE(waiting_fee, 0) ELSE 0 END), 0) as total_revenue
            FROM bookings
            WHERE (($1::int IS NULL AND tenant_id IS NOT NULL) OR tenant_id = $1)
            AND scheduled_pickup_time >= $2 AND scheduled_pickup_time <= $3
        `;

        // 2. Source Breakdown (Manual vs App vs Partner)
        const sourceBreakdownQuery = `
            SELECT 
                CASE 
                    WHEN partner_id IS NOT NULL THEN 'Partner'
                    WHEN source = 'app' THEN 'App'
                    ELSE 'Manual'
                END as source_category,
                COUNT(*) as count
            FROM bookings
            WHERE (($1::int IS NULL AND tenant_id IS NOT NULL) OR tenant_id = $1)
            AND scheduled_pickup_time >= $2 AND scheduled_pickup_time <= $3
            GROUP BY 1
            ORDER BY count DESC
        `;

        // 3. Hourly Trend for that selected day — includes ALL live statuses
        const hourlyTrendQuery = `
            SELECT 
                to_char(DATE_TRUNC('hour', scheduled_pickup_time), 'HH24:00') as hour,
                SUM(COALESCE(fare_final, fare_estimate, 0) + COALESCE(waiting_fee, 0)) as revenue,
                COUNT(*) as bookings
            FROM bookings
            WHERE (($1::int IS NULL AND tenant_id IS NOT NULL) OR tenant_id = $1)
            AND status IN ('pending','completed','assigned','accepted','arrived','waiting_started','started')
            AND scheduled_pickup_time >= $2 AND scheduled_pickup_time <= $3
            GROUP BY 1
            ORDER BY 1
        `;

        const [aggregateRes, sourceRes, trendRes] = await Promise.all([
            db.query(aggregateQuery, [tenantId, startTime, endTime]),
            db.query(sourceBreakdownQuery, [tenantId, startTime, endTime]),
            db.query(hourlyTrendQuery, [tenantId, startTime, endTime])
        ]);

        const aggregate = aggregateRes.rows[0];
        
        // Convert source results to object { Manual: X, App: Y, Partner: Z }
        const sources = { Manual: 0, App: 0, Partner: 0 };
        sourceRes.rows.forEach(r => {
            sources[r.source_category] = parseInt(r.count);
        });

        return {
            date,
            totalBookings: parseInt(aggregate.total_bookings),
            completedCount: parseInt(aggregate.completed_count),
            confirmedRevenue: parseFloat(aggregate.confirmed_revenue || 0),
            projectedRevenue: parseFloat(aggregate.projected_revenue || 0),
            totalRevenue: parseFloat(aggregate.total_revenue || 0),
            sources,
            hourlyTrend: trendRes.rows.map(r => ({
                hour: r.hour,
                revenue: parseFloat(r.revenue),
                bookings: parseInt(r.bookings)
            })),
            currency: 'EUR'
        };
    } catch (error) {
        logger.error('Error in statsService.getRevenuePulse:', error);
        throw error;
    }
};

module.exports = {
    getDashboardStats,
    getBookingQuickStats,
    getAnalyticsStats,
    getRevenuePulse
};
