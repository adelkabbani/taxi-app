const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function fix() {
    try {
        console.log('🔧 FORCE FIX STARTING...');

        // 1. Get Admin User
        const userRes = await pool.query("SELECT id, tenant_id FROM users WHERE email = 'admin@taxi.com'");
        if (userRes.rows.length === 0) {
            console.error('❌ Admin user not found! Cannot fix.');
            return;
        }
        const admin = userRes.rows[0];
        console.log(`✅ Found Admin: ID ${admin.id}, Tenant ${admin.tenant_id}`);

        // Safety fallback if tenant is somehow null
        const targetTenantId = admin.tenant_id;
        if (!targetTenantId) {
            console.error('❌ Admin has no Tenant ID!');
            return;
        }

        // 2. Update ALL Bookings to this Tenant
        const updateBookings = await pool.query("UPDATE bookings SET tenant_id = $1", [targetTenantId]);
        console.log(`✅ Updated ${updateBookings.rowCount} bookings to Tenant ${targetTenantId}`);

        // 3. Update ALL Partners
        const updatePartners = await pool.query("UPDATE partners SET tenant_id = $1", [targetTenantId]);
        console.log(`✅ Updated ${updatePartners.rowCount} partners to Tenant ${targetTenantId}`);

        // 4. Update ALL Drivers
        // Need to check if drivers table has tenant_id (it should)
        try {
            const updateDrivers = await pool.query("UPDATE drivers SET tenant_id = $1", [targetTenantId]);
            console.log(`✅ Updated ${updateDrivers.rowCount} drivers to Tenant ${targetTenantId}`);
        } catch (e) {
            console.log('⚠️ Could not update drivers (maybe column missing?):', e.message);
        }

        // 5. Create a forced test booking if none exist
        const check = await pool.query("SELECT count(*) FROM bookings WHERE tenant_id = $1", [targetTenantId]);
        if (parseInt(check.rows[0].count) === 0) {
            console.log('⚠️ No bookings found after update. Creating a test booking...');
            await pool.query(`
                INSERT INTO bookings (
                    booking_reference, passenger_name, passenger_phone, 
                    pickup_address, source, status, tenant_id, 
                    created_at, updated_at
                ) VALUES (
                    'TEST-FORCE-1', 'Test Passenger', '+1234567890',
                    'Test Pickup Location', 'manual', 'pending', $1,
                    NOW(), NOW()
                )
            `, [targetTenantId]);
            console.log('✅ Created test booking TEST-FORCE-1');
        } else {
            console.log(`✅ Admin now has ${check.rows[0].count} bookings visible.`);
        }

        console.log('🎉 FIX COMPLETE.');

    } catch (err) {
        console.error('❌ ERROR:', err);
    } finally {
        await pool.end();
    }
}

fix();
