require('dotenv').config();
const db = require('./config/database');
const fs = require('fs');

async function check() {
    const res = await db.query("SELECT * FROM tenants WHERE id = 3");
    fs.writeFileSync('tenant_3_check.json', JSON.stringify(res.rows, null, 2));
    process.exit();
}
check();
