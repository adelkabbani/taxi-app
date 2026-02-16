const db = require('./backend/config/database');

async function migrate() {
    console.log('Migrating bookings table...');
    try {
        await db.query(`
            ALTER TABLE bookings 
            ADD COLUMN IF NOT EXISTS assignment_method VARCHAR(50) DEFAULT 'auto',
            ADD COLUMN IF NOT EXISTS auto_assignment_attempts INTEGER DEFAULT 0
        `);
        console.log('✅ Columns added successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        process.exit();
    }
}

migrate();
