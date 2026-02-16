const { Client } = require('pg');
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
        const res = await client.query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'driver_suspensions'");
        console.log('Table driver_suspensions exists:', res.rows.length > 0);
        if (res.rows.length > 0) {
            const cols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'driver_suspensions'");
            console.log('Columns:', cols.rows);
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

check();
