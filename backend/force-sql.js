require('dotenv').config();
const db = require('./config/database');

async function force() {
    console.log('Force assigning Booking 14 to Driver 8...');
    try {
        await db.query(`
            UPDATE bookings 
            SET status = 'assigned', 
                driver_id = 8, 
                assignment_method = 'auto',
                assigned_at = NOW()
            WHERE id = 14
        `);
        console.log('✅ Success!');
    } catch (e) {
        console.error('❌ Failed:', e.message);
    } finally {
        process.exit();
    }
}
force();
