const db = require('./config/database');

async function addVehicle() {
    console.log('🚗 Adding Vehicle to Test Driver...');

    try {
        // 1. Find the driver
        const driverRes = await db.query("SELECT id, user_id FROM drivers WHERE user_id IN (SELECT id FROM users WHERE email='driver_auto@taxi.com')");
        if (driverRes.rows.length === 0) {
            console.log('❌ Test driver not found, run create-test-driver.js first');
            return;
        }
        const driverId = driverRes.rows[0].id;
        const tenantId = 1;

        // 2. Create Vehicle if not exists
        const plate = 'TEST-AUTO-01';
        let vehicleId;

        const vehRes = await db.query("SELECT id FROM vehicles WHERE license_plate = $1", [plate]);
        if (vehRes.rows.length > 0) {
            vehicleId = vehRes.rows[0].id;
        } else {
            const newVeh = await db.query(`
                INSERT INTO vehicles (tenant_id, make, model, year, license_plate, color, status, vehicle_type)
                VALUES ($1, 'Tesla', 'Model 3', 2024, $2, 'White', 'active', 'sedan')
                RETURNING id
            `, [tenantId, plate]);
            vehicleId = newVeh.rows[0].id;
            console.log('   ✅ Created Vehicle:', plate);
        }

        // 3. Assign to driver
        await db.query("UPDATE drivers SET vehicle_id = $1 WHERE id = $2", [vehicleId, driverId]);
        console.log('   ✅ Assigned vehicle to driver');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        process.exit();
    }
}

addVehicle();
