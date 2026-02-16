const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function test() {
    const fs = require('fs');
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync('test-db.log', msg + '\n');
    };

    if (require('fs').existsSync('test-db.log')) require('fs').unlinkSync('test-db.log');

    try {
        log('Testing database connection...');
        const result = await pool.query('SELECT table_name FROM information_schema.tables WHERE table_schema = $1', ['public']);
        log('Tables found: ' + result.rows.map(r => r.table_name).join(', '));

        // Check if columns exist
        const colCheck = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'bookings' AND column_name IN ('passenger_name', 'source', 'passenger_phone')
        `);
        log('Booking columns found: ' + colCheck.rows.map(r => r.column_name).join(', '));

        if (colCheck.rows.length < 3) {
            log('Need to add columns. Running migration...');

            // Add columns if they don't exist
            await pool.query(`
                ALTER TABLE bookings ADD COLUMN IF NOT EXISTS passenger_name VARCHAR(255);
                ALTER TABLE bookings ADD COLUMN IF NOT EXISTS passenger_phone VARCHAR(50);
                ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';
                ALTER TABLE bookings ADD COLUMN IF NOT EXISTS external_reference VARCHAR(255);
            `);
            log('Columns added!');
        }

        log('SUCCESS!');
    } catch (e) {
        log('ERROR: ' + e.message);
        log('Stack: ' + e.stack);
    } finally {
        await pool.end();
    }
}

test();
