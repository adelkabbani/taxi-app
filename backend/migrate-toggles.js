const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'taxi_dispatch',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'adel',
});

async function migrate() {
    console.log('Running migration: Add is_active to pricing_rules...');
    try {
        await pool.query(`
            ALTER TABLE pricing_rules 
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
        `);
        console.log('✅ Column is_active added successfully.');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

migrate();
