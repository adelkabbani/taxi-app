const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'taxi_dispatch',
    user: 'postgres',
    password: 'adel'
});

async function checkBookings() {
    const client = await pool.connect();

    try {
        console.log('🔍 Checking Bookings Table...\n');

        // Count total bookings
        const count = await client.query('SELECT COUNT(*) FROM bookings');
        console.log(`Total Bookings: ${count.rows[0].count}`);

        // Show last 5 bookings
        const result = await client.query(`
            SELECT id, 
                   tenant_id, 
                   passenger_name, 
                   status, 
                   to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created 
            FROM bookings 
            ORDER BY created_at DESC 
            LIMIT 5
        `);

        if (result.rows.length === 0) {
            console.log('⚠️ No bookings found in database');
        } else {
            console.log('\nLast 5 Bookings:');
            result.rows.forEach(b => {
                console.log(`  [${b.id}] Tenant: ${b.tenant_id || 'NULL (Super Admin)'} | ${b.passenger_name} | ${b.status} | ${b.created}`);
            });
        }

        // Check user tenant_id
        const user = await client.query("SELECT email, tenant_id FROM users WHERE email = 'admin@taxi.com'");
        console.log(`\nCurrent User: ${user.rows[0].email}, Tenant ID: ${user.rows[0].tenant_id || 'NULL (Super Admin)'}`);

    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkBookings();
