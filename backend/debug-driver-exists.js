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
        const res = await pool.query("SELECT * FROM users WHERE email = 'driver_auto@taxi.com'");
        console.log('USER:', res.rows);

        const drRes = await pool.query("SELECT * FROM drivers d JOIN users u ON d.user_id = u.id WHERE u.email = 'driver_auto@taxi.com'");
        console.log('DRIVER:', drRes.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
