const fs = require('fs');
require('dotenv').config();
const db = require('./config/database');
const path = require('path');

async function migrate() {
    const migrationPath = path.join(__dirname, '../database/migrations/004_refactor_schedules_to_dates.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    try {
        console.log('Applying migration 004...');
        await db.query(sql);
        console.log('✅ Migration 004 applied successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        process.exit();
    }
}

migrate();
