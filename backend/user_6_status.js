require('dotenv').config();
const db = require('./config/database');
const fs = require('fs');

async function check() {
    const res = await db.query('SELECT id, status FROM users WHERE id = 6');
    fs.writeFileSync('user_6_status.json', JSON.stringify(res.rows, null, 2));
    process.exit();
}
check();
