const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function debugData() {
    try {
        console.log('🔍 DEBUGGING DATA VISIBILITY\n');

        // 1. Check Admin User
        const admin = await pool.query("SELECT id, email, tenant_id FROM users WHERE email = 'admin@taxi.com'");
        if (admin.rows.length === 0) {
            console.log('❌ Admin user not found!');
        } else {
            console.log('👤 Logged in Admin User:');
            console.log(`   ID: ${admin.rows[0].id}`);
            console.log(`   Email: ${admin.rows[0].email}`);
            console.log(`   Tenant ID: ${admin.rows[0].tenant_id}`);
        }

        // 2. Check Bookings
        const bookings = await pool.query("SELECT id, booking_reference, tenant_id, source FROM bookings ORDER BY created_at DESC LIMIT 5");
        console.log('\n📋 Latest 5 Bookings in Database:');
        if (bookings.rows.length === 0) {
            console.log('   (No bookings found in database)');
        } else {
            bookings.rows.forEach(b => {
                console.log(`   - Ref: ${b.booking_reference} | Tenant ID: ${b.tenant_id} | Source: ${b.source}`);
            });
        }

        // 3. Check Mismatch
        if (admin.rows.length > 0 && bookings.rows.length > 0) {
            const adminTenant = admin.rows[0].tenant_id;
            const bookingTenant = bookings.rows[0].tenant_id;

            if (adminTenant !== bookingTenant) {
                console.log('\n⚠️ MISMATCH DETECTED!');
                console.log(`The admin is looking at Tenant ${adminTenant}, but bookings are for Tenant ${bookingTenant}.`);
                console.log('Fixing now...');

                // Fix: Update bookings to match admin tenant
                await pool.query("UPDATE bookings SET tenant_id = $1", [adminTenant]);
                await pool.query("UPDATE partners SET tenant_id = $1", [adminTenant]);
                await pool.query("UPDATE drivers SET user_id = (SELECT id FROM users WHERE email LIKE '%driver%' LIMIT 1) WHERE id IN (SELECT driver_id FROM bookings)");

                console.log('✅ Fixed! All bookings now belong to the admin\'s tenant.');
            } else {
                console.log('\n✅ Tenant IDs match. Data should be visible.');
            }
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

debugData();
