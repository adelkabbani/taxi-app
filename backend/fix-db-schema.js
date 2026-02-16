require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function fixSchema() {
    console.log('🔧 Checking database schema...');

    try {
        const client = await pool.connect();
        try {
            console.log('Connected to database.');

            // Check headers
            const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'bookings'");
            const columns = res.rows.map(r => r.column_name);
            console.log('Current booking columns:', columns.join(', '));

            if (!columns.includes('assignment_method')) {
                console.log('Adding assignment_method...');
                await client.query("ALTER TABLE bookings ADD COLUMN assignment_method VARCHAR(50) DEFAULT 'auto'");
            }

            if (!columns.includes('auto_assignment_attempts')) {
                console.log('Adding auto_assignment_attempts...');
                await client.query("ALTER TABLE bookings ADD COLUMN auto_assignment_attempts INTEGER DEFAULT 0");
            }

            console.log('✅ Schema fixed successfully.');
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

fixSchema();
