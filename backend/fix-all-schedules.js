require('dotenv').config();
const db = require('./config/database');

const fs = require('fs');
const path = require('path');

async function fixSchedules() {
    let output = '📅 Setting 24/7 Schedules for ALL drivers in Tenant 3...\n';
    const log = (msg) => {
        console.log(msg);
        output += msg + '\n';
    };

    try {
        const drivers = await db.query(`
            SELECT d.id FROM drivers d 
            JOIN users u ON d.user_id = u.id 
            WHERE u.tenant_id = 3
        `);

        log(`Found ${drivers.rows.length} drivers.`);

        for (const d of drivers.rows) {
            log(`Updating Driver ${d.id}...`);
            await db.query("DELETE FROM driver_schedules WHERE driver_id = $1", [d.id]);
            for (let day = 0; day <= 6; day++) {
                await db.query(`
                    INSERT INTO driver_schedules (driver_id, day_of_week, start_time, end_time, is_active)
                    VALUES ($1, $2, '00:00:00', '23:59:59', true)
                `, [d.id, day]);
            }
        }
        log('✅ All schedules updated!');
    } catch (err) {
        log('❌ Failed: ' + err.message);
    } finally {
        fs.writeFileSync(path.join(__dirname, 'fix_schedules_log.txt'), output);
        process.exit();
    }
}

fixSchedules();
