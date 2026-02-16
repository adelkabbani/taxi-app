
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function verify() {
    try {
        await client.connect();
        const res = await client.query('SELECT * FROM users WHERE id = 16');
        console.log(res.rows.length === 0 ? '✅ User 16 GONE' : '❌ User 16 EXISTS');

        const admin = await client.query("SELECT * FROM users WHERE email = 'admin@taxi.com'");
        admin.rows.forEach(r => console.log(`Remaining Admin: ID=${r.id}, Tenant=${r.tenant_id}`));
    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await client.end();
    }
}
verify();
