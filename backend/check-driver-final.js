const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'taxi_dispatch',
    user: 'postgres',
    password: 'adel'
});

async function check() {
    try {
        console.log('--- CHECKING DRIVER DATABASE STATUS ---');
        const res = await pool.query("SELECT u.email, u.first_name, u.role, u.status as user_status, d.id as driver_id, d.availability FROM users u LEFT JOIN drivers d ON u.id = d.user_id WHERE u.email = 'driver_auto@taxi.com'");

        if (res.rows.length > 0) {
            console.log('✅ Driver Found:', res.rows[0]);
        } else {
            console.log('❌ Driver NOT Found');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
