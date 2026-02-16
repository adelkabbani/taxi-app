const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function check() {
    let output = '';
    try {
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        output += 'Tables: ' + JSON.stringify(res.rows.map(r => r.table_name)) + '\n';

        const tables = ['users', 'drivers', 'vehicles', 'vehicle_capabilities', 'driver_capabilities', 'driver_metrics'];
        for (const table of tables) {
            try {
                const countRes = await pool.query(`SELECT count(*) FROM ${table}`);
                output += `Table ${table} count: ${countRes.rows[0].count}\n`;

                const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}'`);
                output += `Columns in ${table}: ${JSON.stringify(cols.rows.map(r => r.column_name))}\n`;
            } catch (e) {
                output += `Error checking ${table}: ${e.message}\n`;
            }
        }

        // Check for specific driver (Hans Mueller from the screenshot)
        const hansRes = await pool.query("SELECT u.id as user_id, u.email, u.tenant_id, d.id as driver_id FROM users u JOIN drivers d ON u.id = d.user_id WHERE u.email = 'hans.driver@taxi.com'");
        output += 'Hans Mueller details: ' + JSON.stringify(hansRes.rows) + '\n';

    } catch (err) {
        output += 'Error: ' + err.stack + '\n';
    } finally {
        fs.writeFileSync('db_check_output.txt', output);
        await pool.end();
    }
}

check();
