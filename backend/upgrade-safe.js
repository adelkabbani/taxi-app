require('dotenv').config();
const db = require('./config/database');
const fs = require('fs');

async function upgrade() {
    let log = '';
    const cols = ['priority_level', 'driver_type', 'status'];
    for (const col of cols) {
        try {
            console.log(`Adding ${col}...`);
            log += `Adding ${col}...\n`;
            let type = 'VARCHAR(50)';
            if (col === 'priority_level') type = 'INTEGER';
            await db.query(`ALTER TABLE drivers ADD COLUMN ${col} ${type}`);
            log += `✅ Added ${col}\n`;
        } catch (e) {
            log += `ℹ️  ${col} skipped: ${e.message}\n`;
        }
    }
    fs.writeFileSync('upgrade_final.txt', log);
    process.exit();
}
upgrade();
