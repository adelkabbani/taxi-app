const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
});

async function testConnection() {
    try {
        const result = await pool.query('SELECT version()');
        console.log('✅ Database connected:', result.rows[0].version);
        await pool.end();
    } catch (error) {
        console.error('❌ Connection error:', error.message);
        process.exit(1);
    }
}

testConnection();
