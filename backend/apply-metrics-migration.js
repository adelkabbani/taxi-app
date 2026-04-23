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

        const sqlPath = path.join(__dirname, '../database/migrations/add-metrics-column.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing migration from:', sqlPath);
        await client.query(sql);
        console.log('Migration SUCCESSFUL: rejected_bookings_count column verified/added.');

        await client.end();
    } catch (err) {
        console.error('Migration FAILED:', err.message);
        process.exit(1);
    }
}

applyMigration();
