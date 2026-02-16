const fs = require('fs');
require('dotenv').config();
const db = require('./config/database');

async function checkSchema() {
    try {
        const res = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'driver_schedules'");
        fs.writeFileSync('schema_output.txt', JSON.stringify(res.rows, null, 2));
    } catch (err) {
        fs.writeFileSync('schema_output.txt', 'ERROR: ' + err.message);
    } finally {
        process.exit();
    }
}

checkSchema();
