require('dotenv').config();
const db = require('./config/database');
const fs = require('fs');

async function test() {
    try {
        await db.query('SELECT assignment_failed_reason FROM bookings LIMIT 1');
        fs.writeFileSync('test_booking_col.txt', 'EXISTS');
    } catch (e) {
        fs.writeFileSync('test_booking_col.txt', 'ERROR: ' + e.message);
    }
    process.exit();
}
test();
