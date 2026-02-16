const db = require('./config/database');

async function debugExactQuery() {
    // Hardcoded from your failed case
    const dayOfWeek = 6; // Saturday
    const timeStr = '18:43:00'; // From your booking
    const vehicleType = 'sedan';
    const tenantId = 1;

    console.log('🐞 Debugging Query Logic...');

    // 1. Check basic vehicle match
    const veh = await db.query(
        "SELECT d.id, v.vehicle_type FROM drivers d JOIN vehicles v ON d.vehicle_id = v.id"
    );
    console.log('   Drivers and Vehicles:', JSON.stringify(veh.rows));

    // 2. Check basic schedule match
    const sched = await db.query(
        "SELECT * FROM driver_schedules WHERE day_of_week = $1 AND is_active = true",
        [dayOfWeek]
    );
    console.log('   Schedules for Day 6:', JSON.stringify(sched.rows));

    // 3. Run the exact query component by component
    const fullQuery = `
            SELECT d.id
            FROM drivers d
            JOIN users u ON d.user_id = u.id
            JOIN vehicles v ON d.vehicle_id = v.id
            JOIN driver_schedules ds ON d.id = ds.driver_id
            WHERE u.tenant_id = $1
              AND v.vehicle_type = $2
              AND ds.day_of_week = $3
              AND ds.is_active = true
              AND ds.start_time <= $4
              AND ds.end_time >= $4
              AND d.status = 'active'
              AND u.status = 'active'
    `;

    const res = await db.query(fullQuery, [tenantId, vehicleType, dayOfWeek, timeStr]);
    console.log(`   FULL MATCH RESULT: ${res.rows.length} drivers`);
}

debugExactQuery().then(() => process.exit());
