const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../backend/.env');
require('dotenv').config({ path: envPath });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const logFile = path.join(__dirname, 'migration_check.txt');
const log = (msg) => {
    fs.appendFileSync(logFile, msg + '\n');
    console.log(msg);
};

const checkSchema = async () => {
    fs.writeFileSync(logFile, '--- Schema Verification ---\n');

    try {
        const client = await pool.connect();

        // Check bookings columns
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'bookings' 
            AND column_name IN (
                'auto_assignment_attempts', 
                'flight_number', 
                'service_type', 
                'group_id'
            );
        `);

        log(`Found booking columns: ${res.rows.map(r => r.column_name).join(', ')}`);

        // Check round robin table
        const tableRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'assignment_round_robin';
        `);

        log(`Found table: ${tableRes.rows.length > 0 ? 'assignment_round_robin' : 'NONE'}`);

        // Check users plain_password (should be missing)
        const passwordRes = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'plain_password';
        `);

        log(`Found plain_password column: ${passwordRes.rows.length > 0 ? 'YES (Fail)' : 'NO (Success)'}`);

        client.release();
    } catch (err) {
        log(`Error: ${err.message}`);
    } finally {
        pool.end();
        process.exit(0);
    }
};

checkSchema();
