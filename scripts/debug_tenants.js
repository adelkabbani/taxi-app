const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const envPath = path.join(__dirname, '../backend/.env');
console.log('Loading .env from:', envPath);

if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
} else {
    console.error('.env file NOT FOUND!');
    process.exit(1);
}

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function debugTenants() {
    try {
        console.log('Connecting to DB with:', {
            host: process.env.DB_HOST,
            db: process.env.DB_NAME,
            user: process.env.DB_USER
        });

        const client = await pool.connect();
        console.log('Connected!');

        console.log('--- TENANTS ---');
        const tenants = await client.query('SELECT * FROM tenants');
        console.table(tenants.rows);

        console.log('\n--- DRIVERS per TENANT ---');
        const drivers = await client.query(`
            SELECT 
                t.name as company_name, 
                t.id as tenant_id,
                COUNT(d.id) as driver_count,
                STRING_AGG(u.first_name || ' ' || u.last_name, ', ') as driver_names
            FROM tenants t
            LEFT JOIN users u ON t.id = u.tenant_id
            LEFT JOIN drivers d ON u.id = d.user_id
            GROUP BY t.id, t.name
        `);
        console.table(drivers.rows);

        client.release();
    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await pool.end();
    }
}

debugTenants();
