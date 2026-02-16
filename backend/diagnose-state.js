const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function diagnose() {
    try {
        console.log('🔍 DIAGNOSTIC START');
        console.log(`📡 Connecting to DB: ${process.env.DB_NAME} as ${process.env.DB_USER}`);

        // 1. Check Users
        console.log('\n👤 ALL USERS:');
        const users = await pool.query("SELECT id, email, role, tenant_id FROM users");
        if (users.rows.length === 0) console.log("   [!] No users found!");
        users.rows.forEach(u => {
            console.log(`   - ID: ${u.id} | Email: ${u.email} | Role: ${u.role} | Tenant: ${u.tenant_id}`);
        });

        // 2. Check Bookings
        console.log('\n📅 ALL BOOKINGS (Last 10):');
        const bookings = await pool.query("SELECT id, booking_reference, passenger_name, status, tenant_id, source FROM bookings ORDER BY created_at DESC LIMIT 10");
        if (bookings.rows.length === 0) console.log("   [!] No bookings found!");
        bookings.rows.forEach(b => {
            console.log(`   - ID: ${b.id} | Ref: ${b.booking_reference} | Tenant: ${b.tenant_id} | Source: ${b.source} | Status: ${b.status}`);
        });

        // 3. Stats by Tenant
        console.log('\n📊 COUNTS BY TENANT:');
        const tenantCounts = await pool.query(`
            SELECT tenant_id, COUNT(*) as count 
            FROM bookings 
            GROUP BY tenant_id
        `);
        tenantCounts.rows.forEach(row => {
            console.log(`   - Tenant ${row.tenant_id}: ${row.count} bookings`);
        });

    } catch (err) {
        console.error('❌ ERROR:', err);
    } finally {
        await pool.end();
    }
}

diagnose();
