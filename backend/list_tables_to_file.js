const fs = require('fs');
require('dotenv').config();
const db = require('./config/database');

async function listTables() {
    try {
        const res = await db.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
        fs.writeFileSync('tables_output.txt', JSON.stringify(res.rows.map(r => r.tablename), null, 2));
    } catch (err) {
        fs.writeFileSync('tables_output.txt', 'ERROR: ' + err.message);
    } finally {
        process.exit();
    }
}

listTables();
