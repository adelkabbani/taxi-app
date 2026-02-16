require('dotenv').config();
const db = require('./config/database');

async function checkSchema() {
    try {
        const res = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'driver_schedules'");
        console.log('Columns in driver_schedules:', res.rows);
    } catch (err) {
        console.error('Error checking schema:', err);
    } finally {
        process.exit();
    }
}

checkSchema();
