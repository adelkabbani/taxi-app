const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '../backend/.env');
console.log('Loading .env from:', envPath);
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
} else {
    console.error('.env file NOT FOUND!');
    process.exit(1);
}

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const applySchemaChanges = async () => {
    console.log('Starting Schema Alignment Migration (Direct PG)...');

    try {
        const client = await pool.connect();
        console.log('Connected to DB');

        try {
            await client.query('BEGIN');

            const bookingCols = [
                "ADD COLUMN IF NOT EXISTS auto_assignment_attempts INTEGER DEFAULT 0",
                "ADD COLUMN IF NOT EXISTS assignment_method VARCHAR(50) DEFAULT 'manual'",
                "ADD COLUMN IF NOT EXISTS assignment_failed_reason TEXT",
                "ADD COLUMN IF NOT EXISTS last_assignment_attempt TIMESTAMP",
                "ADD COLUMN IF NOT EXISTS flight_number VARCHAR(20)",
                "ADD COLUMN IF NOT EXISTS service_type VARCHAR(50) DEFAULT 'standard'",
                "ADD COLUMN IF NOT EXISTS group_id VARCHAR(50)"
            ];

            for (const col of bookingCols) {
                try {
                    console.log(`Executing: ALTER TABLE bookings ${col}`);
                    await client.query(`ALTER TABLE bookings ${col};`);
                } catch (e) {
                    console.log(`Note: Booking column issue: ${e.message}`);
                }
            }

            console.log('Creating assignment_round_robin table...');
            await client.query(`
                CREATE TABLE IF NOT EXISTS assignment_round_robin (
                    tenant_id INTEGER PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
                    last_assigned_driver_id INTEGER,
                    last_assigned_at TIMESTAMP,
                    assignment_count INTEGER DEFAULT 0
                );
            `);

            console.log('Adding is_active to drivers...');
            try { await client.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;`); } catch (e) { console.log(e.message); }

            console.log('Adding is_active to users...');
            try { await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;`); } catch (e) { console.log(e.message); }

            console.log('Dropping invoices columns...');
            try { await client.query(`ALTER TABLE invoices DROP COLUMN IF EXISTS fare_final;`); } catch (e) { console.log(e.message); }
            try { await client.query(`ALTER TABLE invoices DROP COLUMN IF EXISTS waiting_fee;`); } catch (e) { console.log(e.message); }
            try { await client.query(`ALTER TABLE invoices DROP COLUMN IF EXISTS no_show_fee;`); } catch (e) { console.log(e.message); }

            console.log('Dropping plain_password...');
            try { await client.query(`ALTER TABLE users DROP COLUMN IF EXISTS plain_password;`); } catch (e) { console.log(e.message); }

            await client.query('COMMIT');
            console.log('✅ Schema Alignment Completed!');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Transaction Failed:', error);
        } finally {
            client.release();
            pool.end();
            process.exit(0);
        }
    } catch (err) {
        console.error('❌ Connection Failed:', err);
        process.exit(1);
    }
};

applySchemaChanges();
