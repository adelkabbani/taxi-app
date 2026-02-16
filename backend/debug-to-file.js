require('dotenv').config();
const db = require('./config/database');
const fs = require('fs');

async function debugSystem() {
    let output = '';
    const log = (msg) => { output += msg + '\n'; console.log(msg); };

    try {
        log('--- SYSTEM STATUS ---');

        const tenantRes = await db.query("SELECT id, name FROM tenants");
        log('Tenants: ' + JSON.stringify(tenantRes.rows));

        const adminRes = await db.query("SELECT id, tenant_id, email FROM users WHERE role = 'admin'");
        log('Admin Users: ' + JSON.stringify(adminRes.rows));

        const driversRes = await db.query(`
            SELECT d.id, u.first_name, u.last_name, u.tenant_id, d.availability, d.location_updated_at 
            FROM drivers d 
            JOIN users u ON d.user_id = u.id
        `);
        log('\n--- ALL DRIVERS IN DB ---');
        log(JSON.stringify(driversRes.rows, null, 2));

    } catch (err) {
        log('ERROR: ' + err.message);
    } finally {
        fs.writeFileSync('db_debug.txt', output);
        process.exit();
    }
}

debugSystem();
