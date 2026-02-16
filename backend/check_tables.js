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
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('Tables:', res.rows.map(r => r.table_name));

        const tables = ['vehicle_capabilities', 'driver_capabilities', 'driver_metrics'];
        for (const table of tables) {
            try {
                const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}'`);
                console.log(`Columns in ${table}:`, cols.rows.map(r => r.column_name));
            } catch (e) {
                console.log(`Table ${table} might be missing:`, e.message);
            }
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

check();
