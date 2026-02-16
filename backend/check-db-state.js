require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');

async function check() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'taxi_dispatch'
    });

    let output = '';
    const log = (msg) => {
        output += msg + '\n';
        console.log(msg);
    };

    try {
        await client.connect();

        const users = await client.query("SELECT id, email, tenant_id FROM users");
        log('--- USERS ---');
        users.rows.forEach(r => log(JSON.stringify(r)));

        const tenants = await client.query("SELECT id, name, slug FROM tenants");
        log('--- TENANTS ---');
        tenants.rows.forEach(r => log(JSON.stringify(r)));

        const drivers = await client.query("SELECT d.id, u.email, u.tenant_id FROM drivers d JOIN users u ON d.user_id = u.id");
        log('--- DRIVERS ---');
        drivers.rows.forEach(r => log(JSON.stringify(r)));

        fs.writeFileSync('db-state-fixed.txt', output);

    } catch (err) {
        fs.writeFileSync('db-state-fixed.txt', 'Error: ' + err.message);
    } finally {
        await client.end();
    }
}

check();
