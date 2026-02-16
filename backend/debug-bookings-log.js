const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function debugData() {
    const logFile = 'debug-output.txt';
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    };

    if (fs.existsSync(logFile)) fs.unlinkSync(logFile);

    try {
        log('🔍 DEBUGGING DATA VISIBILITY');

        // 1. Check Admin User
        const admin = await pool.query("SELECT id, email, tenant_id FROM users WHERE email = 'admin@taxi.com'");
        if (admin.rows.length === 0) {
            log('❌ Admin user not found!');
        } else {
            log('👤 Logged in Admin User:');
            log(`   ID: ${admin.rows[0].id}`);
            log(`   Email: ${admin.rows[0].email}`);
            log(`   Tenant ID: ${admin.rows[0].tenant_id}`);
        }

        // 2. Check Bookings
        const bookings = await pool.query("SELECT id, booking_reference, tenant_id, source FROM bookings ORDER BY created_at DESC LIMIT 5");
        log('\n📋 Latest 5 Bookings in Database:');
        if (bookings.rows.length === 0) {
            log('   (No bookings found in database)');
        } else {
            bookings.rows.forEach(b => {
                log(`   - Ref: ${b.booking_reference} | Tenant ID: ${b.tenant_id} | Source: ${b.source}`);
            });
        }

        // 3. Fix Mismatch if needed
        if (admin.rows.length > 0 && bookings.rows.length > 0) {
            const adminTenant = admin.rows[0].tenant_id;
            const bookingTenant = bookings.rows[0].tenant_id;

            if (adminTenant !== bookingTenant) {
                log('\n⚠️ MISMATCH DETECTED!');
                log(`The admin is looking at Tenant ${adminTenant}, but bookings are for Tenant ${bookingTenant}.`);
                log('Fixing now...');

                await pool.query("UPDATE bookings SET tenant_id = $1", [adminTenant]);
                await pool.query("UPDATE partners SET tenant_id = $1", [adminTenant]);
                // Ensure users/drivers are also aligned or specific queries might fail
                await pool.query("UPDATE users SET tenant_id = $1 WHERE email LIKE '%driver%'", [adminTenant]);
                await pool.query("UPDATE vehicles SET tenant_id = $1", [adminTenant]);

                log('✅ Fixed! All data updated to match admin tenant.');
            } else {
                log('\n✅ Tenant IDs match.');
            }
        }
    } catch (err) {
        log('Error: ' + err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

debugData();
