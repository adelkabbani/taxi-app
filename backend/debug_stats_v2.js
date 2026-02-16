const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const log = (msg) => {
    fs.appendFileSync('debug_output.txt', msg + '\n');
    console.log(msg);
};

log('Starting debug script...');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

pool.on('error', (err) => {
    log('Pool Error: ' + err.message);
});

const db = {
    query: (text, params) => pool.query(text, params),
};

const getAnalyticsStats = async (tenantId, range = 'daily') => {
    try {
        log(`Testing getAnalyticsStats with tenantId=${tenantId} range=${range}`);

        // COPY OF LOGIC FROM statsService.js (ensure it matches)
        let timeInterval;
        let groupBy;
        let dateFormat;

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

        const summaryQuery = `
            SELECT 
                COUNT(*) as total_requests,
                COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
                COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
                COUNT(*) FILTER (WHERE status = 'no_show') as no_show_bookings,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN COALESCE(fare_final, 0) + COALESCE(waiting_fee, 0) ELSE 0 END), 0) as total_revenue,
                COUNT(DISTINCT passenger_id) as unique_passengers
            FROM bookings
            WHERE ($1::int IS NULL OR tenant_id = $1)
            AND created_at >= NOW() - ${timeInterval}
        `;
        log('Running Summary Query...');
        const summaryRes = await db.query(summaryQuery, [tenantId]);
        log('Summary Query OK. Rows: ' + summaryRes.rowCount);

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
        log('Running Trend Query...');
        const trendRes = await db.query(trendQuery, [tenantId]);
        log('Trend Query OK. Rows: ' + trendRes.rowCount);

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
        log('Running Sources Query...');
        const sourcesRes = await db.query(sourcesQuery, [tenantId]);
        log('Sources Query OK. Rows: ' + sourcesRes.rowCount);

        const statusQuery = `
            SELECT status as name, COUNT(*) as value
            FROM bookings
            WHERE ($1::int IS NULL OR tenant_id = $1)
            AND created_at >= NOW() - ${timeInterval}
            GROUP BY 1
        `;
        log('Running Status Query...');
        const statusRes = await db.query(statusQuery, [tenantId]);
        log('Status Query OK. Rows: ' + statusRes.rowCount);

        log('All queries successful');

    } catch (error) {
        log('ERROR CAUGHT: ' + error.message);
        log('Stack: ' + error.stack);
    } finally {
        pool.end();
        log('Done.');
    }
};

const checkEnums = async () => {
    try {
        const res = await db.query("SELECT enum_range(NULL::booking_status)");
        log('Enum Values: ' + JSON.stringify(res.rows[0].enum_range));
    } catch (e) {
        log('Enum Error: ' + e.message);
    } finally {
        pool.end();
    }
};

checkEnums();
