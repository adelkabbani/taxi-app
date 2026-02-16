const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function check() {
    try {
        console.log('🔍 CHECKING TABLE COLUMNS');
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'bookings'
        `);
        const cols = res.rows.map(r => r.column_name);
        console.log('Bookings Columns:', cols.join(', '));

        if (cols.includes('passenger_name')) {
            console.log('✅ passenger_name exists');

            console.log('\n📊 SAMPLING DATA (First 5 bookings):');
            const sample = await pool.query('SELECT id, passenger_name, passenger_id, tenant_id FROM bookings ORDER BY created_at DESC LIMIT 5');

            if (sample.rows.length === 0) {
                console.log('⚠️ No bookings found in table');
            } else {
                sample.rows.forEach(r => {
                    console.log(`Booking #${r.id}: name="${r.passenger_name}", pid=${r.passenger_id}, tenant=${r.tenant_id}`);
                });
            }

            console.log('\n👥 CHECKING USERS:');
            const users = await pool.query('SELECT id, email, role, tenant_id FROM users WHERE email LIKE \'%admin%\' LIMIT 10');
            users.rows.forEach(u => {
                console.log(`User ${u.id} (${u.email}): role=${u.role}, tenant=${u.tenant_id}`);
            });

        } else {
            console.log('❌ passenger_name MISSING');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}
check();
