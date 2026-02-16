const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'taxi_dispatch'
    });
    await client.connect();
    const users = await client.query('SELECT id, email FROM users');
    const drivers = await client.query('SELECT id, user_id FROM drivers');
    console.log('---USERS---');
    users.rows.forEach(u => console.log(`${u.id}: ${u.email}`));
    console.log('---DRIVERS---');
    drivers.rows.forEach(d => console.log(`Driver ID: ${d.id}, User ID: ${d.user_id}`));
    await client.end();
}
run();
