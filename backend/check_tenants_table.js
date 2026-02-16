require('dotenv').config();
const db = require('./config/database');
const fs = require('fs');

async function check() {
    try {
        const res = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tenants'");
        fs.writeFileSync('tenants_structure.json', JSON.stringify(res.rows, null, 2));
        console.log('Structure saved.');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
