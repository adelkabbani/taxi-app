require('dotenv').config();
const db = require('./config/database');
const fs = require('fs');

async function check() {
    const res = await db.query('SELECT id, scheduled_pickup_time, NOW() as current_db_time FROM bookings WHERE id = 9');
    fs.writeFileSync('booking_9_report.json', JSON.stringify(res.rows[0], null, 2));
    process.exit();
}
check();
