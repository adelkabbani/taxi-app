require('dotenv').config();
const db = require('./config/database');
const fs = require('fs');

async function check() {
    const res = await db.query('SELECT b.id, b.booking_reference, b.status, b.driver_id, d.first_name as driver_name FROM bookings b LEFT JOIN drivers dr ON b.driver_id = dr.id LEFT JOIN users d ON dr.user_id = d.id WHERE b.tenant_id = 3 ORDER BY b.id DESC LIMIT 20');
    fs.writeFileSync('bookings_check.json', JSON.stringify(res.rows, null, 2));

    const timeline = await db.query(`
        SELECT bt.booking_id, b.booking_reference, bt.event_type, bt.actor_type, bt.actor_id, bt.created_at,
               u.first_name || ' ' || u.last_name as actor_name
        FROM booking_timeline bt
        JOIN bookings b ON bt.booking_id = b.id
        LEFT JOIN users u ON bt.actor_id = u.id
        WHERE bt.event_type = 'driver_assigned' OR bt.event_type = 'booking_created'
        ORDER BY bt.created_at DESC
        LIMIT 20
    `);
    fs.writeFileSync('timeline_check.json', JSON.stringify(timeline.rows, null, 2));
    process.exit();
}
check();
