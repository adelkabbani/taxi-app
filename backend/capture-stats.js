require('dotenv').config();
const statsService = require('./services/statsService');
const db = require('./config/database');
const fs = require('fs');

async function runTest() {
    try {
        const tenantRes = await db.query("SELECT id FROM tenants WHERE slug = 'berlin-taxi' LIMIT 1");
        if (tenantRes.rows.length === 0) {
            throw new Error('No tenant found with slug berlin-taxi');
        }
        const tenantId = tenantRes.rows[0].id;
        const stats = await statsService.getDashboardStats(tenantId);
        fs.writeFileSync('stats_result.json', JSON.stringify(stats, null, 2));
        process.exit(0);
    } catch (err) {
        fs.writeFileSync('stats_err.txt', err.message + '\n' + err.stack);
        process.exit(1);
    }
}

runTest();
