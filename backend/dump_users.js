require('dotenv').config();
const db = require('./config/database');
const fs = require('fs');

async function check() {
    try {
        const res = await db.query("SELECT id, email, role, tenant_id FROM users");
        fs.writeFileSync('users_dump.json', JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
