const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function runMigration() {
    console.log('🔄 Running database migration...\n');

    try {
        const migrationFile = path.join(__dirname, '..', '..', 'database', 'migrations', '001_add_booking_source_fields.sql');

        if (!fs.existsSync(migrationFile)) {
            console.error('❌ Migration file not found:', migrationFile);
            process.exit(1);
        }

        const sql = fs.readFileSync(migrationFile, 'utf8');

        await pool.query(sql);

        console.log('✅ Migration completed successfully!\n');
        console.log('Added columns to bookings table:');
        console.log('  - passenger_name');
        console.log('  - passenger_phone');
        console.log('  - source');
        console.log('  - external_reference');

        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
