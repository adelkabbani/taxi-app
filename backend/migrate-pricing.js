console.log('Migration script started...');
require('dotenv').config();
console.log('Dotenv loaded. Database host:', process.env.DB_HOST);
const db = require('./config/database');
const logger = require('./config/logger');

async function migrate() {
    console.log('Running migration query...');
    try {
        await db.query(`
            ALTER TABLE partner_pricing_rules 
            ADD COLUMN IF NOT EXISTS min_fare_threshold DECIMAL(10, 2) DEFAULT 0.00;
        `);
        console.log('Migration successful: Added min_fare_threshold to partner_pricing_rules');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
