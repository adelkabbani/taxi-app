require('dotenv').config();
const db = require('./config/database');

async function fixBookings() {
    console.log('🔧 Fixing Bookings table schema...');

    try {
        await db.query(`
            ALTER TABLE bookings 
            ADD COLUMN IF NOT EXISTS assignment_failed_reason TEXT,
            ADD COLUMN IF NOT EXISTS last_assignment_attempt TIMESTAMP;
        `);
        console.log('✅ Bookings table upgraded!');
    } catch (err) {
        console.error('❌ Upgrade Failed:', err.message);
    } finally {
        process.exit();
    }
}

fixBookings();
