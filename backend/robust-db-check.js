require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

async function check() {
    let out = 'ROBUST DB CHECK\n';
    try {
        out += 'Env Host: ' + process.env.DB_HOST + '\n';
        out += 'Env User: ' + process.env.DB_USER + '\n';

        const pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'taxi_dispatch',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
            connectionTimeoutMillis: 5000,
        });

        out += 'Attempting connect...\n';
        const client = await pool.connect();
        out += 'Connected!\n';

        const res = await client.query("SELECT * FROM tenants");
        out += 'Tenants: ' + res.rows.length + '\n';
        out += JSON.stringify(res.rows, null, 2) + '\n';

        client.release();
        await pool.end();
    } catch (e) {
        out += 'FATAL ERROR: ' + e.message + '\n' + e.stack + '\n';
    }
    fs.writeFileSync('robust_db_report.txt', out);
    process.exit();
}
check();
