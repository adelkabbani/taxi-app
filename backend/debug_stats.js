const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const db = {
    query: (text, params) => pool.query(text, params),
};

const getAnalyticsStats = async (tenantId, range = 'daily') => {
    try {
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
                COUNT(*) as total_requests
            FROM bookings
            WHERE ($1::int IS NULL OR tenant_id = $1)
            AND created_at >= NOW() - ${timeInterval}
        `;
        console.log('Testing Query:', summaryQuery);
        await db.query(summaryQuery, [tenantId]);
        console.log('Summary Query: OK');

        const trendQuery = `
            SELECT 
                to_char(${groupBy}, '${dateFormat}') as time_label,
                COUNT(*) FILTER (WHERE status = 'completed') as completed_count
            FROM bookings
            WHERE ($1::int IS NULL OR tenant_id = $1)
            AND created_at >= NOW() - ${timeInterval}
            GROUP BY 1
            ORDER BY 1
        `;
        console.log('Testing Trend Query:', trendQuery);
        await db.query(trendQuery, [tenantId]);
        console.log('Trend Query: OK');

    } catch (error) {
        console.error('ERROR:', error);
    } finally {
        pool.end();
    }
};

getAnalyticsStats(null, 'daily');
