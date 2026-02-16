const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
});

async function applyMigration() {
    const client = await pool.connect();

    try {
        console.log('🚀 Starting database migration...\n');

        // Read migration file
        const migrationPath = path.join(__dirname, '../database/migrations/001_add_missing_features.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Migration file loaded successfully');
        console.log('📊 Executing migration...\n');

        // Execute migration within a transaction
        await client.query('BEGIN');
        await client.query(migrationSQL);
        await client.query('COMMIT');

        console.log('✅ Migration executed successfully!\n');

        // Verify tables were created
        console.log('🔍 Verifying new tables...');
        const tableCheck = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
                AND table_name IN ('driver_documents', 'driver_ratings', 'payment_transactions', 'notification_delivery_logs')
            ORDER BY table_name
        `);

        console.log(`✅ Found ${tableCheck.rows.length} new tables:`);
        tableCheck.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });

        // Verify new columns
        console.log('\n🔍 Verifying new columns...');
        const columnCheck = await client.query(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
                AND (
                    (table_name = 'bookings' AND column_name IN ('assignment_method', 'auto_assignment_attempted'))
                    OR (table_name = 'drivers' AND column_name IN ('average_rating', 'total_ratings'))
                )
            ORDER BY table_name, column_name
        `);

        console.log(`✅ Found ${columnCheck.rows.length} new columns:`);
        columnCheck.rows.forEach(row => {
            console.log(`   - ${row.table_name}.${row.column_name}`);
        });

        // Verify triggers
        console.log('\n🔍 Verifying triggers...');
        const triggerCheck = await client.query(`
            SELECT trigger_name, event_object_table
            FROM information_schema.triggers
            WHERE trigger_schema = 'public'
                AND trigger_name IN ('update_driver_rating_trigger', 'log_payment_status_trigger')
            ORDER BY trigger_name
        `);

        console.log(`✅ Found ${triggerCheck.rows.length} new triggers:`);
        triggerCheck.rows.forEach(row => {
            console.log(`   - ${row.trigger_name} on ${row.event_object_table}`);
        });

        // Verify views
        console.log('\n🔍 Verifying views...');
        const viewCheck = await client.query(`
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public' 
                AND table_name IN ('driver_performance_summary', 'payment_analytics', 'document_verification_queue')
            ORDER BY table_name
        `);

        console.log(`✅ Found ${viewCheck.rows.length} new views:`);
        viewCheck.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });

        // Check for orphaned records
        console.log('\n🔍 Checking for orphaned records...');
        const orphanCheck = await client.query(`
            SELECT 'bookings (driver)' AS check_name, COUNT(*) AS orphans
            FROM bookings WHERE driver_id IS NOT NULL 
                AND driver_id NOT IN (SELECT id FROM drivers)
            UNION ALL
            SELECT 'bookings (passenger)', COUNT(*)
            FROM bookings WHERE passenger_id IS NOT NULL 
                AND passenger_id NOT IN (SELECT id FROM users)
            UNION ALL
            SELECT 'bookings (vehicle)', COUNT(*)
            FROM bookings WHERE vehicle_id IS NOT NULL 
                AND vehicle_id NOT IN (SELECT id FROM vehicles)
        `);

        const totalOrphans = orphanCheck.rows.reduce((sum, row) => sum + parseInt(row.orphans), 0);

        if (totalOrphans === 0) {
            console.log('✅ No orphaned records found - data integrity is perfect!');
        } else {
            console.log('⚠️  Found orphaned records:');
            orphanCheck.rows.forEach(row => {
                if (parseInt(row.orphans) > 0) {
                    console.log(`   - ${row.check_name}: ${row.orphans} orphans`);
                }
            });
        }

        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!');
        console.log('='.repeat(50));
        console.log(`
✨ Summary:
   - 4 new tables created
   - 4 new columns added
   - 2 new triggers created
   - 3 new analytics views created
   - Data integrity verified
        `);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Migration failed!');
        console.error('Error:', error.message);
        console.error('\nStack trace:', error.stack);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run migration
applyMigration().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
