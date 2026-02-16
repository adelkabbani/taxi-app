const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '.env');
console.log('Loading .env from:', envPath);

if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
} else {
    console.error('ERROR: .env file NOT FOUND at', envPath);
    process.exit(1);
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
        console.log('Connecting...');
        const client = await pool.connect();
        console.log('Connected!');

        const tenants = await client.query('SELECT * FROM tenants');
        console.log('--- TENANTS ---');
        console.table(tenants.rows);

        const drivers = await client.query(`
            SELECT 
                t.name as company_name, 
                t.id as tenant_id,
                COUNT(d.id) as driver_count
            FROM tenants t
            LEFT JOIN users u ON t.id = u.tenant_id
            LEFT JOIN drivers d ON u.id = d.user_id
            GROUP BY t.id, t.name
        `);
        console.log('--- DRIVERS PER TENANT ---');
        console.table(drivers.rows);

        client.release();
    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await pool.end();
    }
}

run();
