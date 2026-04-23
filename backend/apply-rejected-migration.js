const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function applyMigration() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'taxi_dispatch'
    });

    try {
        await client.connect();
        console.log('Connected to database for migration...');

        const sqlPath = path.join(__dirname, '../database/migrations/add-rejected-status.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing migration from:', sqlPath);
        
        // Split SQL into parts if it contains 'ALTER TYPE' which can't run in transactions
        // Our script actually uses DO $$ blocks which are safe provided they're handled correctly.
        // But for simplicity, we'll execute the whole block.
        
        await client.query(sql);
        console.log('Migration SUCCESSFUL: assignment_logs table created and booking_status verified.');

        await client.end();
    } catch (err) {
        console.error('Migration FAILED:', err.message);
        process.exit(1);
    }
}

applyMigration();
