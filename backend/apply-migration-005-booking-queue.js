const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Starting migration 005...');
        await client.query('BEGIN');

        await client.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS flight_number TEXT;");
        console.log('Added flight_number');

        await client.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'standard';");
        console.log('Added service_type');

        await client.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS group_id TEXT;");
        console.log('Added group_id');

        await client.query('COMMIT');
        console.log('Migration 005 successful');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
        process.exit(0);
    }
}

migrate();
