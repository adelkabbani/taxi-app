require('dotenv').config();
const db = require('./config/database');
const assignmentService = require('./services/assignmentService');
const fs = require('fs');

const path = require('path');

async function forceAssignAll() {
    let output = '🦾 FORCE-STARTING ASSIGNMENT RUN at ' + new Date().toISOString() + '\n';

    try {
        const res = await db.query(`
            SELECT id, booking_reference 
            FROM bookings 
            WHERE status = 'pending' 
        `);

        output += 'Found ' + res.rows.length + ' pending bookings.\n';

        for (const booking of res.rows) {
            output += '🔄 Processing ' + booking.booking_reference + '...\n';
            try {
                const result = await assignmentService.assignBooking(booking.id);
                if (result) {
                    output += '   ✅ SUCCESS! Assigned to Driver ID: ' + result.driver_id + '\n';
                } else {
                    output += '   ⚠️  Failed to assign (returned null)\n';
                }
            } catch (e) {
                output += '   ❌ ERROR: ' + e.message + '\n' + e.stack + '\n';
            }
        }
    } catch (err) {
        output += 'FATAL ERROR: ' + err.message + '\n' + err.stack;
    } finally {
        fs.writeFileSync(path.join(__dirname, 'force_final_log.txt'), output);
        process.exit();
    }
}

forceAssignAll();
