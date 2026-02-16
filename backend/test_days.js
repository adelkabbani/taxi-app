require('dotenv').config();
const db = require('./config/database');
const fs = require('fs');
const path = require('path');

async function testV() {
    let log = '';
    const pickupStr = 'Sat Jan 10 2026 19:51:00 GMT+0100';
    const dateObj = new Date(pickupStr);
    const dayOfWeek = dateObj.getDay();
    log += `Pickup: ${pickupStr}\n`;
    log += `JS Day: ${dayOfWeek}\n`;

    const res = await db.query("SELECT day_of_week FROM driver_schedules WHERE driver_id = 8");
    log += `DB Days for Driver 8: ${res.rows.map(r => r.day_of_week).join(', ')}\n`;

    fs.writeFileSync(path.join(__dirname, 'day_test.txt'), log);
    process.exit();
}
testV();
