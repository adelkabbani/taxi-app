require('dotenv').config();
const db = require('./config/database');

async function upgradeDrivers() {
    console.log('🔧 Upgrading Drivers table schema...');

    try {
        // Add missing columns if they don't exist
        await db.query(`
            ALTER TABLE drivers 
            ADD COLUMN IF NOT EXISTS priority_level INTEGER DEFAULT 3,
            ADD COLUMN IF NOT EXISTS driver_type VARCHAR(50) DEFAULT 'standard',
            ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
            
            -- Sync status with availability if status was just added
            UPDATE drivers SET status = 'active' WHERE status IS NULL;
        `);
        console.log('✅ Drivers table upgraded!');
    } catch (err) {
        console.error('❌ Upgrade Failed:', err.message);
    } finally {
        process.exit();
    }
}

upgradeDrivers();
