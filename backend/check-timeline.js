require('dotenv').config();
const db = require('./config/database');

async function check() {
    const bookingId = process.argv[2];
    if (!bookingId) {
        console.log('Fetching latest 10 assignments...');
        const res = await db.query(`
            SELECT bt.booking_id, b.booking_reference, bt.event_type, bt.actor_type, bt.actor_id, bt.created_at,
                   CASE 
                     WHEN bt.actor_type = 'system' THEN 'AI / Auto-Assignment'
                     ELSE u.first_name || ' ' || u.last_name || ' (Office)'
                   END as assigned_by_name
            FROM booking_timeline bt
            JOIN bookings b ON bt.booking_id = b.id
            LEFT JOIN users u ON bt.actor_id = u.id
            WHERE bt.event_type = 'driver_assigned'
            ORDER BY bt.created_at DESC
            LIMIT 10
        `);
        console.table(res.rows);
    } else {
        const res = await db.query(`
            SELECT bt.*, u.first_name, u.last_name
            FROM booking_timeline bt
            LEFT JOIN users u ON bt.actor_id = u.id
            WHERE bt.booking_id = $1
            ORDER BY bt.created_at ASC
        `, [bookingId]);
        console.log(`Timeline for Booking ${bookingId}:`);
        console.table(res.rows);
    }
    process.exit();
}
check();
