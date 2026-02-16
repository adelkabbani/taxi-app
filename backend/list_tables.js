require('dotenv').config();
const db = require('./config/database');

async function listTables() {
    try {
        const res = await db.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema'");
        console.log('Tables:', res.rows.map(r => r.tablename));
    } catch (err) {
        console.error('Error listing tables:', err);
    } finally {
        process.exit();
    }
}

listTables();
