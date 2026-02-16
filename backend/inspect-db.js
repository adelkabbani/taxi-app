const db = require('./config/database');

async function inspectBookings() {
    console.log('🔍 INSPECTING DB STATE...');
    try {
        const bookings = await db.query(`
            SELECT id, booking_reference, status, driver_id, vehicle_type, assignment_method, auto_assignment_attempts
            FROM bookings 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        console.log('--- RECENT BOOKINGS ---');
        console.table(bookings.rows);

        const attempts = await db.query(`
            SELECT * FROM assignment_attempts ORDER BY attempted_at DESC LIMIT 5
        `);
        console.log('\n--- RECENT ASSIGNMENT ATTEMPTS ---');
        console.table(attempts.rows);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

inspectBookings();
