const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
}

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function run() {
    try {
        const client = await pool.connect();

        // Get drivers with their login info
        const res = await client.query(`
            SELECT 
                u.email, 
                u.plain_password, 
                u.first_name, 
                u.last_name,
                t.name as company_name
            FROM drivers d
            JOIN users u ON d.user_id = u.id
            LEFT JOIN tenants t ON u.tenant_id = t.id
            WHERE u.plain_password IS NOT NULL
            LIMIT 5
        `);

        const output = res.rows.map(r =>
            `Driver: ${r.first_name} ${r.last_name} (${r.company_name})\nUsername: ${r.email}\nPassword: ${r.plain_password}\n---`
        ).join('\n');

        fs.writeFileSync(path.join(__dirname, 'driver_creds.txt'), output);

        client.release();
    } catch (e) {
        fs.writeFileSync(path.join(__dirname, 'driver_creds.txt'), 'Error: ' + e.message);
    } finally {
        await pool.end();
    }
}

run();
