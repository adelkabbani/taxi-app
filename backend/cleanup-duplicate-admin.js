const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function cleanup() {
    try {
        console.log('🧹 CLEANUP STARTING...');

        // Find users with admin@taxi.com
        const res = await pool.query("SELECT id, email, tenant_id FROM users WHERE email = 'admin@taxi.com'");
        console.log('Found admin users:', res.rows);

        if (res.rows.length > 1) {
            // Keep the one with tenant_id = 3 (which has the bookings)
            const toDelete = res.rows.find(u => u.tenant_id !== 3);
            if (toDelete) {
                console.log(`Deleting duplicate admin with ID ${toDelete.id} (tenant ${toDelete.tenant_id})`);
                await pool.query('DELETE FROM users WHERE id = $1', [toDelete.id]);
                console.log('✅ Deleted successfully.');
            } else {
                console.log('⚠️ Could not decide which one to delete (no tenant 3 found?).');
            }
        } else {
            console.log('✅ No duplicates found.');
        }

    } catch (err) {
        console.error('❌ ERROR:', err);
    } finally {
        await pool.end();
    }
}

cleanup();
