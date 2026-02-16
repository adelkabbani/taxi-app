require('dotenv').config();
const db = require('./config/database');
const fs = require('fs');
const path = require('path');

async function testQuery() {
    let log = 'SERVICE QUERY TEST\n';
    try {
        const tenantId = 3;
        const vehicleType = 'sedan';
        const dayOfWeek = 6;
        const timeStr = '19:51:00';

        const query = `
            SELECT d.id, u.first_name, d.user_id, d.vehicle_id, v.vehicle_type
            FROM drivers d
            JOIN users u ON d.user_id = u.id
            JOIN vehicles v ON d.vehicle_id = v.id
            JOIN driver_schedules ds ON d.id = ds.driver_id
            WHERE u.tenant_id = $1
              AND LOWER(v.vehicle_type::text) = LOWER($2::text)
              AND ds.day_of_week = $3
              AND ds.is_active = true
              AND ds.start_time <= $4
              AND ds.end_time >= $4
              AND d.status = 'active'
              AND u.status = 'active'
        `;

        const res = await db.query(query, [tenantId, vehicleType, dayOfWeek, timeStr]);
        log += `Found ${res.rows.length} matches.\n`;
        log += JSON.stringify(res.rows, null, 2);
    } catch (e) {
        log += '❌ ERROR: ' + e.message;
    }
    fs.writeFileSync(path.join(__dirname, 'service_query_test.txt'), log);
    process.exit();
}
testQuery();
