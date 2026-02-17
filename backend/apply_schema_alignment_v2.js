const db = require('./config/database');

const applySchemaChanges = async () => {
    console.log('Starting Schema Alignment Migration (Robust Version)...');

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // 1. ADD COLUMNS TO BOOKINGS (One by one to avoid syntax errors in older PG versions if applicable)
        console.log('Adding specific columns to bookings...');

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
                await client.query(`ALTER TABLE bookings ${col};`);
            } catch (e) {
                console.log(`Note: Could not add booking column ${col} (might exist or error): ${e.message}`);
            }
        }

        // 2. CREATE ROUND ROBIN TABLE
        console.log('Creating assignment_round_robin table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS assignment_round_robin (
                tenant_id INTEGER PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
                last_assigned_driver_id INTEGER,
                last_assigned_at TIMESTAMP,
                assignment_count INTEGER DEFAULT 0
            );
        `);

        // 3. ADD IS_ACTIVE (Soft Delete Prep)
        console.log('Adding is_active to drivers and users...');
        try { await client.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;`); } catch (e) { console.log(e.message); }
        try { await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;`); } catch (e) { console.log(e.message); }


        // 4. CLEANUP INVOICES (Remove Redundant Data)
        console.log('Cleaning up invoices table...');
        console.log('(Skipping DROP COLUMN for safety in this run, uncomment to enforce)');
        // await client.query(`ALTER TABLE invoices DROP COLUMN IF EXISTS fare_final, DROP COLUMN IF EXISTS waiting_fee, DROP COLUMN IF EXISTS no_show_fee;`);


        // 5. REMOVE PLAIN PASSWORD (Security Fix)
        console.log('Removing plain_password column...');
        try {
            await client.query(`ALTER TABLE users DROP COLUMN IF EXISTS plain_password;`);
        } catch (e) {
            console.log(`Could not drop plain_password: ${e.message}`);
        }

        await client.query('COMMIT');
        console.log('✅ Schema Alignment Completed Successfully!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration Failed:', error);
    } finally {
        client.release();
        process.exit(0);
    }
};

applySchemaChanges();
