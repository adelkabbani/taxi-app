const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    // Connect to 'postgres' db first to create the target db if it doesn't exist
    database: 'postgres'
};

async function migrate() {
    console.log('🐘 Starting database migration...');

    // 1. Create Database if not exists
    const sysClient = new Client(config);
    try {
        await sysClient.connect();
        const dbName = process.env.DB_NAME || 'taxi_dispatch';

        const res = await sysClient.query(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`);
        if (res.rows.length === 0) {
            console.log(`Creating database ${dbName}...`);
            await sysClient.query(`CREATE DATABASE "${dbName}"`);
        } else {
            console.log(`Database ${dbName} already exists.`);
        }
    } catch (err) {
        console.error('Failed to check/create database:', err.message);
        process.exit(1);
    } finally {
        await sysClient.end();
    }

    // 2. Connect to the target database
    const dbClient = new Client({
        ...config,
        database: process.env.DB_NAME || 'taxi_dispatch'
    });

    try {
        await dbClient.connect();

        // 3. Run Schema
        console.log('Running schema.sql...');
        const schemaPath = path.join(__dirname, '../../database/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await dbClient.query(schemaSql);

        // 4. Run State Machine
        console.log('Running state-machine.sql...');
        const stateMachinePath = path.join(__dirname, '../../database/state-machine.sql');
        const stateMachineSql = fs.readFileSync(stateMachinePath, 'utf8');
        await dbClient.query(stateMachineSql);

        console.log('✅ Migration successful!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await dbClient.end();
    }
}

migrate();
