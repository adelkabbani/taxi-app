require('dotenv').config();
const { Client } = require('pg');

async function cleanup() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'taxi_dispatch'
    });

    try {
        await client.connect();
        const res = await client.query("DELETE FROM users WHERE id = 16");
        console.log(`Deleted ${res.rowCount} duplicate admin users (ID 16).`);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

cleanup();
