require('dotenv').config();
const db = require('./config/database');
const fs = require('fs');

async function check() {
    const r = await db.query('SELECT count(*) FROM driver_schedules');
    fs.writeFileSync('count.txt', r.rows[0].count);
    process.exit();
}
check();
