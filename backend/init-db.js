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
};

async function initDb() {
    console.log('Starting DB Initialization process...');
    console.log('Config:', { ...config, password: '****' });

    const client = new Client({ ...config, database: 'postgres' });

    try {
        await client.connect();
        console.log('Successfully connected to postgres default database.');

        // 1. Create Database
        console.log(`Checking if database "${process.env.DB_NAME}" exists...`);
        const res = await client.query('SELECT 1 FROM pg_database WHERE datname=$1', [process.env.DB_NAME]);
        if (res.rowCount === 0) {
            console.log(`Creating database "${process.env.DB_NAME}"...`);
            await client.query(`CREATE DATABASE ${process.env.DB_NAME}`);
            console.log('✓ Database created.');
        } else {
            console.log('✓ Database already exists.');
        }
        await client.end();

        // 2. Connect to the new database to run schema
        const name = process.env.DB_NAME;
        console.log(`Connecting to new database "${name}"...`);
        const dbClient = new Client({ ...config, database: name });
        await dbClient.connect();
        console.log(`Connected to "${name}".`);

        // Run Schema
        console.log('Reading schema.sql...');
        const schemaSql = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
        console.log('Executing schema.sql...');
        await dbClient.query(schemaSql);
        console.log('✓ Schema initialized.');

        // Run State Machine
        console.log('Reading state-machine.sql...');
        const smSql = fs.readFileSync(path.join(__dirname, '../database/state-machine.sql'), 'utf8');
        console.log('Executing state-machine.sql...');
        await dbClient.query(smSql);
        console.log('✓ State machine initialized.');

        await dbClient.end();
        console.log('\n✅ Database initialization complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Initialization failed!');
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        if (err.stack) console.error('Stack trace:', err.stack);
        process.exit(1);
    }
}

initDb();
