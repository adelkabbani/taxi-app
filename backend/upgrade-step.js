require('dotenv').config();
const db = require('./config/database');

async function upgrade() {
    const cols = ['priority_level', 'driver_type', 'status'];
    for (const col of cols) {
        try {
            console.log(`Adding ${col}...`);
            let type = 'VARCHAR(50)';
            if (col === 'priority_level') type = 'INTEGER';
            await db.query(`ALTER TABLE drivers ADD COLUMN ${col} ${type}`);
            console.log(`✅ Added ${col}`);
        } catch (e) {
            console.log(`ℹ️  ${col} skipped: ${e.message}`);
        }
    }
    process.exit();
}
upgrade();
