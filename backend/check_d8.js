require('dotenv').config();
const db = require('./config/database');
const fs = require('fs');

const path = require('path');

async function check() {
    const res = await db.query("SELECT * FROM driver_schedules WHERE driver_id = 8");
    fs.writeFileSync(path.join(__dirname, 'driver_8_schedules.json'), JSON.stringify(res.rows, null, 2));
    process.exit();
}
check();
