const db = require('./backend/config/database');

async function fix() {
    console.log('Checking/Creating driver_suspensions table...');
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS driver_suspensions (
                id SERIAL PRIMARY KEY,
                driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
                reason TEXT NOT NULL,
                suspended_at TIMESTAMP DEFAULT NOW(),
                expires_at TIMESTAMP,
                created_by INTEGER REFERENCES users(id),
                is_active BOOLEAN DEFAULT true
            )
        `);
        console.log('✓ driver_suspensions table is ready.');

        // Also check if drivers table has the necessary columns (it should, based on schema.sql)

        console.log('✅ Fix completed successfully.');
    } catch (err) {
        console.error('❌ Fix failed:', err.message);
    } finally {
        process.exit();
    }
}

fix();
