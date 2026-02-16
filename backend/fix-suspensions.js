const { Client } = require('pg');
require('dotenv').config();

async function fix() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'taxi_dispatch'
    });

    console.log('Connecting to database...');
    try {
        await client.connect();
        console.log('Connected.');

        console.log('Checking/Creating driver_suspensions table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS driver_suspensions (
                id SERIAL PRIMARY KEY,
                driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
                reason TEXT NOT NULL,
                suspended_at TIMESTAMP DEFAULT NOW(),
                expires_at TIMESTAMP,
                created_by INTEGER REFERENCES users(id),
                is_active BOOLEAN DEFAULT true
            )
        `);
        console.log('✓ driver_suspensions table is ready.');

        // Verify it works by selecting from it
        const res = await client.query("SELECT * FROM driver_suspensions LIMIT 1");
        console.log('Verification query successful.');

        console.log('✅ Fix completed successfully.');
    } catch (err) {
        console.error('❌ Fix failed:', err.message);
        console.error(err.stack);
    } finally {
        await client.end();
    }
}

fix();
