const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'taxi_dispatch',
    user: 'postgres',
    password: 'adel'
});

async function addPlainPasswordColumn() {
    try {
        console.log('Adding plain_password column to users table...');
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS plain_password VARCHAR(255);");
        console.log('✅ Column added successfully.');

        // Optional: Set a default for existing test driver
        await pool.query("UPDATE users SET plain_password = 'driver123' WHERE email = 'driver_auto@taxi.com'");
        console.log('✅ Updated test driver password visibility.');

    } catch (e) {
        console.error('Error adding column:', e);
    } finally {
        await pool.end();
    }
}

addPlainPasswordColumn();
