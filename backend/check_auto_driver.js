require('dotenv').config();
const db = require('./config/database');
const fs = require('fs');

async function check() {
    const res = await db.query("SELECT d.id, u.first_name, u.tenant_id FROM drivers d JOIN users u ON d.user_id = u.id WHERE u.email = 'driver_auto@taxi.com'");
    fs.writeFileSync('auto_driver_check.json', JSON.stringify(res.rows, null, 2));
    process.exit();
}
check();
