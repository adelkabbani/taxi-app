const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function check() {
    try {
        const bookings = await pool.query(`
            SELECT booking_reference, source, passenger_name
            FROM bookings 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        console.log(`DB Count: ${bookings.rowCount}`);
        if (bookings.rowCount > 0) {
            console.log('Sample:', bookings.rows[0]);
        }
    } catch (err) {
        console.error('DB ERROR:', err.message);
    } finally {
        await pool.end();
    }
}
check();
