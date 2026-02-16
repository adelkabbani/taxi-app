require('dotenv').config();
const db = require('./config/database');
const fs = require('fs');

async function check() {
    try {
        const res = await db.query("SELECT id, booking_reference, status, driver_id FROM bookings WHERE status = 'pending' OR status = 'assigned' ORDER BY created_at DESC LIMIT 10");
        fs.writeFileSync('check_bookings.json', JSON.stringify(res.rows, null, 2));
        console.log('Done');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
