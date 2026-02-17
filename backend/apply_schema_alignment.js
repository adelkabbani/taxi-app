const db = require('./config/database');
const logger = require('./config/logger');

const applySchemaChanges = async () => {
    console.log('Starting Schema Alignment Migration...');

    try {
        await db.query('BEGIN');

        // 1. ADD COLUMNS TO BOOKINGS
        console.log('Adding missing columns to bookings table...');
        await db.query(`
            ALTER TABLE bookings 
            ADD COLUMN IF NOT EXISTS auto_assignment_attempts INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS assignment_method VARCHAR(50) DEFAULT 'manual',
            ADD COLUMN IF NOT EXISTS assignment_failed_reason TEXT,
            ADD COLUMN IF NOT EXISTS last_assignment_attempt TIMESTAMP,
            ADD COLUMN IF NOT EXISTS flight_number VARCHAR(20),
            ADD COLUMN IF NOT EXISTS service_type VARCHAR(50) DEFAULT 'standard',
            ADD COLUMN IF NOT EXISTS group_id VARCHAR(50);
        `);

        // 2. CREATE ROUND ROBIN TABLE
        console.log('Creating assignment_round_robin table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS assignment_round_robin (
                tenant_id INTEGER PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
                last_assigned_driver_id INTEGER,
                last_assigned_at TIMESTAMP,
                assignment_count INTEGER DEFAULT 0
            );
        `);

        // 3. ADD IS_ACTIVE TO DRIVERS & USERS (Soft Delete Prep)
        console.log('Adding is_active to drivers and users...');
        await db.query(`
            ALTER TABLE drivers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
        `);

        // 4. CLEANUP INVOICES (Remove Redundant Data)
        console.log('Cleaning up invoices table...');
        await db.query(`
            ALTER TABLE invoices 
            DROP COLUMN IF EXISTS fare_final,
            DROP COLUMN IF EXISTS waiting_fee,
            DROP COLUMN IF EXISTS no_show_fee;
        `);

        // 5. REMOVE PLAIN PASSWORD (Security Fix)
        console.log('Removing plain_password column...');
        await db.query(`
            ALTER TABLE users DROP COLUMN IF EXISTS plain_password;
        `);

        await db.query('COMMIT');
        console.log('✅ Schema Alignment Completed Successfully!');
        process.exit(0);

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('❌ Migration Failed:', error);
        process.exit(1);
    }
};

applySchemaChanges();
