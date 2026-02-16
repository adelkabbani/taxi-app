require('dotenv').config();
const db = require('./config/database');

async function createTable() {
    console.log('🏗️ Creating driver_schedules table...');
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS driver_schedules (
                id SERIAL PRIMARY KEY,
                driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
                day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
                start_time TIME NOT NULL DEFAULT '00:00:00',
                end_time TIME NOT NULL DEFAULT '23:59:59',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_driver_schedules_driver ON driver_schedules(driver_id);
            CREATE INDEX IF NOT EXISTS idx_driver_schedules_day_time ON driver_schedules(day_of_week, start_time, end_time);
        `);
        console.log('✅ Table created!');

        // Populate for existing drivers if needed, but I'll let the user manage or I'll run my test driver script.
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
createTable();
