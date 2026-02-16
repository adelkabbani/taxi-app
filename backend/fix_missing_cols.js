const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function fix() {
    try {
        console.log('🔧 Checking DB Schema for missing columns...');

        // Add passenger_name
        await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS passenger_name VARCHAR(255)");
        console.log('✅ Checked/Added passenger_name');

        // Add passenger_phone
        await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS passenger_phone VARCHAR(50)");
        console.log('✅ Checked/Added passenger_phone');

        // Add source
        await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual'");
        console.log('✅ Checked/Added source');

        // Add external_reference
        await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS external_reference VARCHAR(100)");
        console.log('✅ Checked/Added external_reference');

        console.log('🎉 Schema update complete.');

    } catch (err) {
        console.error('❌ ERROR:', err);
    } finally {
        await pool.end();
    }
}

fix();
