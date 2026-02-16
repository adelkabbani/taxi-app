require('dotenv').config();
const db = require('./config/database');
const fs = require('fs');
const path = require('path');

async function test() {
    let log = 'DB TEST START\n';
    try {
        const r = await db.query('SELECT NOW()');
        log += 'Connected: ' + r.rows[0].now + '\n';

        const drivers = await db.query("SELECT id FROM drivers LIMIT 1");
        if (drivers.rows.length > 0) {
            const id = drivers.rows[0].id;
            log += 'Testing with Driver ID: ' + id + '\n';
            await db.query("DELETE FROM driver_schedules WHERE driver_id = $1 AND day_of_week = 6", [id]);
            await db.query("INSERT INTO driver_schedules (driver_id, day_of_week, start_time, end_time, is_active) VALUES ($1, 6, '00:00:00', '23:59:59', true)", [id]);
            log += '✅ Inserted test schedule\n';
        }
    } catch (e) {
        log += '❌ ERROR: ' + e.message + '\n';
    }
    fs.writeFileSync(path.join(__dirname, 'db_test_outcome.txt'), log);
    process.exit();
}
test();
