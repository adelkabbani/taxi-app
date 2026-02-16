const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function check() {
    try {
        const res = await pool.query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'driver_suspensions'");
        console.log('Tables:', res.rows);
        if (res.rows.length === 0) {
            console.log('Table driver_suspensions DOES NOT EXIST');
        } else {
            const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'driver_suspensions'");
            console.log('Columns:', cols.rows);
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

check();
