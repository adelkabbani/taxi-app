require('dotenv').config();
const db = require('./config/database');

async function getTestData() {
    try {
        // Get Tenant
        const tenantResult = await db.query('SELECT id, name FROM tenants LIMIT 1');
        const tenant = tenantResult.rows[0];
        console.log('--- TENANT ---');
        console.log(tenant);

        // Get Admin
        const adminResult = await db.query("SELECT id, email FROM users WHERE role = 'admin' AND tenant_id = $1 LIMIT 1", [tenant.id]);
        const admin = adminResult.rows[0];
        console.log('\n--- ADMIN ---');
        console.log(admin);

        // Get Drivers with Vehicles
        const driversResult = await db.query(`
      SELECT d.id as driver_id, u.id as user_id, u.email, v.id as vehicle_id, v.vehicle_type
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      JOIN vehicles v ON d.vehicle_id = v.id
      WHERE u.tenant_id = $1 AND u.role = 'driver'
      LIMIT 2
    `, [tenant.id]);

        console.log('\n--- DRIVERS ---');
        console.log(driversResult.rows);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

getTestData();
