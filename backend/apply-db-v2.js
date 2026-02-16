const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'taxi_dispatch'
};

async function init() {
    const client = new Client(config);
    try {
        await client.connect();
        console.log('Connected to taxi_dispatch.');

        // 1. Run Schema
        console.log('Applying schema.sql...');
        const schemaSql = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
        await client.query(schemaSql);
        console.log('✓ Schema applied.');

        // 2. Run State Machine
        console.log('Applying state-machine.sql...');
        const smSql = fs.readFileSync(path.join(__dirname, '../database/state-machine.sql'), 'utf8');
        await client.query(smSql);
        console.log('✓ State machine applied.');

        await client.end();
        console.log('\n✅ Database is ready!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to initialize database!');
        console.error(err.message);
        process.exit(1);
    }
}

init();
