require('dotenv').config();
const db = require('./config/database');

async function debugSystem() {
    try {
        console.log('--- SYSTEM STATUS ---');

        const adminRes = await db.query("SELECT id, tenant_id, email FROM users WHERE email = 'admin@taxi.com'");
        if (adminRes.rows.length === 0) {
            console.log('Admin user not found!');
            process.exit(1);
        }
        console.log('Admin User:', adminRes.rows[0]);
        const tenantId = adminRes.rows[0].tenant_id;

        const driversRes = await db.query(`
            SELECT d.id, u.first_name, u.last_name, u.tenant_id, d.availability, d.location_updated_at, d.current_lat, d.current_lng
            FROM drivers d 
            JOIN users u ON d.user_id = u.id
        `);
        console.log('\n--- ALL DRIVERS IN DB ---');
        console.table(driversRes.rows);

        const onlineDriversRes = await db.query(`
            SELECT count(*) as count 
            FROM drivers d
            JOIN users u ON d.user_id = u.id
            WHERE u.tenant_id = $1 
            AND d.availability = 'available'
            AND (d.location_updated_at IS NULL OR d.location_updated_at > NOW() - INTERVAL '30 minutes')
        `, [tenantId]);
        console.log('\nOnline Drivers Count for Tenant', tenantId, '(within 30m) :', onlineDriversRes.rows[0].count);

    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        process.exit();
    }
}

debugSystem();
