require('dotenv').config();
const db = require('./config/database');
const fs = require('fs');

async function check() {
    let output = '';
    try {
        const tables = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        output += 'TABLES:\n' + JSON.stringify(tables.rows, null, 2) + '\n\n';

        for (const table of ['bookings', 'booking_requirements', 'drivers', 'vehicles', 'assignment_attempts']) {
            try {
                const cols = await db.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table}' AND table_schema = 'public'`);
                output += `COLUMNS FOR ${table}:\n` + JSON.stringify(cols.rows, null, 2) + '\n\n';
            } catch (e) {
                output += `ERROR GETTING COLUMNS FOR ${table}: ${e.message}\n\n`;
            }
        }
    } catch (e) {
        output += 'FATAL: ' + e.message;
    }
    fs.writeFileSync('schema_dump.json', output);
    process.exit();
}
check();
