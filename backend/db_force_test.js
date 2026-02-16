require('dotenv').config();
const db = require('./config/database');
const fs = require('fs');
const path = require('path');

async function testV() {
    let log = '';
    try {
        log += 'Updating Booking 14...\n';
        const up = await db.query("UPDATE bookings SET driver_id = 8, status = 'assigned' WHERE id = 14 RETURNING *");
        log += `Updated rows: ${up.rows.length}\n`;
        if (up.rows.length > 0) {
            log += `New Status: ${up.rows[0].status}, Driver: ${up.rows[0].driver_id}\n`;
        }

        const sel = await db.query("SELECT id, status, driver_id FROM bookings WHERE id = 14");
        log += `Direct Select: Status=${sel.rows[0].status}, Driver=${sel.rows[0].driver_id}\n`;
    } catch (e) {
        log += '❌ ERROR: ' + e.message + '\n';
    }
    fs.writeFileSync(path.join(__dirname, 'db_force_result.txt'), log);
    process.exit();
}
testV();
