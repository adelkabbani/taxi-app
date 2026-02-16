require('dotenv').config();
const db = require('./config/database');
const assignmentService = require('./services/assignmentService');

async function forceAssignAll() {
    console.log('🦾 FORCE-STARTING ASSIGNMENT RUN...');

    try {
        // 1. Get all pending bookings eligible for auto-assignment
        const res = await db.query(`
            SELECT id, booking_reference 
            FROM bookings 
            WHERE status = 'pending' 
            AND assignment_method != 'auto_failed'
        `);

        if (res.rows.length === 0) {
            console.log('   ✅ No pending bookings manually found.');
        } else {
            console.log(`   Found ${res.rows.length} pending bookings.`);

            for (const booking of res.rows) {
                console.log(`   🔄 Processing ${booking.booking_reference}...`);
                try {
                    const result = await assignmentService.assignBooking(booking.id);
                    if (result) {
                        console.log(`      ✅ SUCCESS! Assigned to Driver ID: ${result.driver_id}`);
                    } else {
                        console.log(`      ⚠️  Failed to assign (returned null)`);
                    }
                } catch (e) {
                    console.log(`      ❌ ERROR: ${e.message}`);
                }
            }
        }

    } catch (err) {
        console.error('Fatal Error:', err);
    } finally {
        process.exit();
    }
}

forceAssignAll();
