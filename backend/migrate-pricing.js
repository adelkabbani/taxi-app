require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('Running migration...');
        
        // 1. Add enums (cannot be in transaction if not handled perfectly, so run directly)
        const newTypes = ['economy_sedan', 'business'];
        for (const type of newTypes) {
            try {
                await client.query(`ALTER TYPE vehicle_type ADD VALUE IF NOT EXISTS '${type}'`);
                console.log(`✅ Added '${type}' to vehicle_type enum.`);
            } catch (e) {
                if (e.message.includes('already exists')) {
                    console.log(`ℹ️ '${type}' already exists in enum.`);
                } else {
                    console.error(`❌ Failed to add enum value '${type}':`, e.message);
                }
            }
        }

        // 2. Create pricing_rules table
        console.log('Creating pricing_rules table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS pricing_rules (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
                vehicle_type vehicle_type NOT NULL,
                min_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(tenant_id, vehicle_type)
            );
        `);
        console.log('✅ pricing_rules table created.');

    } catch (e) {
        console.error('❌ Migration failed:', e.message);
    } finally {
        client.release();
        await pool.end();
        console.log('Done.');
        process.exit(0);
    }
}

runMigration();
