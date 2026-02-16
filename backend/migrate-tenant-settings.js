require('dotenv').config();
const db = require('./config/database');

async function migrate() {
    try {
        console.log('Adding stop_sell and auto_assign_min_fare to tenants table...');

        await db.query(`
            ALTER TABLE tenants 
            ADD COLUMN IF NOT EXISTS stop_sell BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS auto_assign_min_fare NUMERIC(10, 2) DEFAULT 0.00;
        `);

        console.log('✅ Migration successful.');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        process.exit();
    }
}

migrate();
