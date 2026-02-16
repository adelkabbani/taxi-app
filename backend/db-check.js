const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function check() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'taxi_dispatch'
    });

    try {
        await client.connect();
        const db = await client.query('SELECT current_database()');
        const users = await client.query('SELECT id, email, role FROM users');
        const drivers = await client.query('SELECT id, user_id, availability FROM drivers');
        const out = {
            db: db.rows[0].current_database,
            users: users.rows,
            drivers: drivers.rows
        };
        fs.writeFileSync('db-results.json', JSON.stringify(out, null, 2));
        await client.end();
    } catch (err) {
        fs.writeFileSync('db-results.json', JSON.stringify({ error: err.message, stack: err.stack }, null, 2));
    }
}

check();
