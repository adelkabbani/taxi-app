require('dotenv').config();
const statsService = require('./services/statsService');
const db = require('./config/database');

async function runTest() {
    try {
        console.log('Testing Dashboard Stats Service...');

        // Get primary tenant ID
        const tenantRes = await db.query("SELECT id FROM tenants WHERE slug = 'berlin-taxi' LIMIT 1");
        if (tenantRes.rows.length === 0) {
            console.error('FAIL: No tenant found');
            process.exit(1);
        }
        const tenantId = tenantRes.rows[0].id;
        console.log(`Using Tenant ID: ${tenantId}`);

        const stats = await statsService.getDashboardStats(tenantId);

        console.log('STATS RESULT:');
        console.log(JSON.stringify(stats, null, 2));

        // Basic Assertions
        const expectedKeys = ['onlineDrivers', 'activeTrips', 'todaysBookings', 'todaysRevenue', 'currency', 'lastUpdated'];
        const missingKeys = expectedKeys.filter(key => !(key in stats));

        if (missingKeys.length > 0) {
            console.error(`FAIL: Missing keys: ${missingKeys.join(', ')}`);
            process.exit(1);
        }

        console.log('SUCCESS: All keys present and valid.');
        process.exit(0);
    } catch (err) {
        console.error('FATAL TEST ERROR:');
        console.error(err);
        process.exit(1);
    }
}

runTest();
