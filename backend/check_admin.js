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
        const res = await pool.query("SELECT id, email, role, tenant_id FROM users WHERE role = 'admin'");
        output += 'Admins: ' + JSON.stringify(res.rows) + '\n';

        const tenants = await pool.query("SELECT * FROM tenants");
        output += 'Tenants: ' + JSON.stringify(tenants.rows) + '\n';

    } catch (err) {
        output += 'Error: ' + err.stack + '\n';
    } finally {
        fs.writeFileSync('admin_check.txt', output);
        await pool.end();
    }
}

check();
