const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
});

async function verifyMigration() {
    try {
        console.log('🔍 Verifying Migration Results...\n');

        // Check tables
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
                AND table_name IN ('driver_documents', 'driver_ratings', 'payment_transactions', 'notification_delivery_logs')
            ORDER BY table_name
        `);

        console.log(`✅ New Tables (${tablesResult.rows.length}/4):`);
        tablesResult.rows.forEach(row => console.log(`   • ${row.table_name}`));

        // Check new columns
        const columnsResult = await pool.query(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
                AND (
                    (table_name = 'bookings' AND column_name IN ('assignment_method', 'auto_assignment_attempted'))
                    OR (table_name = 'drivers' AND column_name IN ('average_rating', 'total_ratings'))
                )
            ORDER BY table_name, column_name
        `);

        console.log(`\n✅ New Columns (${columnsResult.rows.length}/4):`);
        columnsResult.rows.forEach(row => console.log(`   • ${row.table_name}.${row.column_name}`));

        // Check triggers
        const triggersResult = await pool.query(`
            SELECT DISTINCT trigger_name, event_object_table
            FROM information_schema.triggers
            WHERE trigger_schema = 'public'
                AND trigger_name IN ('update_driver_rating_trigger', 'log_payment_status_trigger')
            ORDER BY trigger_name
        `);

        console.log(`\n✅ New Triggers (${triggersResult.rows.length}/2):`);
        triggersResult.rows.forEach(row => console.log(`   • ${row.trigger_name} on ${row.event_object_table}`));

        // Check views
        const viewsResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public' 
                AND table_name IN ('driver_performance_summary', 'payment_analytics', 'document_verification_queue')
            ORDER BY table_name
        `);

        console.log(`\n✅ New Views (${viewsResult.rows.length}/3):`);
        viewsResult.rows.forEach(row => console.log(`   • ${row.table_name}`));

        // Summary
        const allGood = tablesResult.rows.length === 4 &&
            columnsResult.rows.length === 4 &&
            triggersResult.rows.length === 2 &&
            viewsResult.rows.length === 3;

        console.log('\n' + '='.repeat(50));
        if (allGood) {
            console.log('🎉 MIGRATION SUCCESSFUL - All components verified!');
        } else {
            console.log('⚠️  MIGRATION INCOMPLETE - Some components missing');
        }
        console.log('='.repeat(50) + '\n');

        await pool.end();
    } catch (error) {
        console.error('❌ Verification error:', error.message);
        process.exit(1);
    }
}

verifyMigration();
