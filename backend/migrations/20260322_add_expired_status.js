const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function migrateAddExpiredStatus() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });

    try {
        await client.connect();
        
        console.log("--- Migration: Adding 'expired' to booking_status enum ---");
        
        // Note: ALTER TYPE ... ADD VALUE cannot run inside a transaction block 
        // in some Postgres versions. We run it directly.
        await client.query("ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'expired'");
        
        console.log("SUCCESS! 'expired' status added to booking_status enum.");

    } catch (err) {
        if (err.code === '42710') {
            console.log("'expired' value already exists in booking_status enum. Skipping.");
        } else {
            console.error("Migration failed:", err.message);
        }
    } finally {
        await client.end();
    }
}

migrateAddExpiredStatus();
