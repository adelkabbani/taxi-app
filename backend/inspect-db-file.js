require('dotenv').config();
const db = require('./config/database');
const fs = require('fs');
const path = require('path');

async function inspectBookings() {
    let output = '🔍 INSPECTING DB STATE (FILE MODE)...\n\n';
    try {
        const bookings = await db.query(`
            SELECT id, booking_reference, status, driver_id, assignment_method, assignment_failed_reason, last_assignment_attempt
            FROM bookings 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        output += '--- RECENT BOOKINGS ---\n';
        output += JSON.stringify(bookings.rows, null, 2) + '\n\n';

        const attempts = await db.query(`
            SELECT * FROM assignment_attempts ORDER BY attempted_at DESC LIMIT 5
        `);
        output += '--- RECENT ASSIGNMENT ATTEMPTS ---\n';
        output += JSON.stringify(attempts.rows, null, 2) + '\n\n';

        const drivers = await db.query(`
            SELECT d.id, u.first_name, d.status, v.vehicle_type 
            FROM drivers d 
            JOIN users u ON d.user_id = u.id 
            LEFT JOIN vehicles v ON d.vehicle_id = v.id
        `);
        output += '--- DRIVERS ---\n';
        output += JSON.stringify(drivers.rows, null, 2) + '\n';

        fs.writeFileSync(path.join(__dirname, 'db-dump.txt'), output);
        console.log('Dump written to db-dump.txt');

    } catch (e) {
        console.error(e);
        fs.writeFileSync(path.join(__dirname, 'db-dump.txt'), 'ERROR: ' + e.message);
    } finally {
        process.exit();
    }
}

inspectBookings();
