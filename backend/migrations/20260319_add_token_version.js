const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function migrateTokenVersion() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });

    try {
        await client.connect();
        
        console.log("--- Migration: Adding token_version to users table ---");
        
        // 1. Check if column already exists
        const checkRes = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'token_version'
        `);

        if (checkRes.rows.length > 0) {
            console.log("Column 'token_version' already exists. Skipping.");
        } else {
            await client.query("ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 0");
            console.log("SUCCESS! Column 'token_version' added to users table.");
        }

        // 2. Initialize existing users with 0 just in case default didn't take for existing rows
        await client.query("UPDATE users SET token_version = 0 WHERE token_version IS NULL");
        console.log("Initial token_version values synchronized.");

    } catch (err) {
        console.error("Migration failed:", err.message);
    } finally {
        await client.end();
    }
}

migrateTokenVersion();
