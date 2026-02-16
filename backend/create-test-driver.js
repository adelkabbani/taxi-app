require('dotenv').config();
const db = require('./config/database');
const bcrypt = require('bcrypt');

async function createTestDriver() {
    console.log('🏁 Creating Test Driver...');

    try {
        // 1. Create User
        const email = 'driver_auto@taxi.com';
        const passwordHash = await bcrypt.hash('driver123', 10);

        let userId;
        const userRes = await db.query("SELECT id FROM users WHERE email = $1", [email]);

        if (userRes.rows.length > 0) {
            userId = userRes.rows[0].id;
            console.log('   ℹ️  User already exists with ID:', userId);
        } else {
            const newUser = await db.query(`
                INSERT INTO users (first_name, last_name, email, phone, password_hash, role, status, tenant_id)
                VALUES ('Auto', 'Driver', $1, '+19998887777', $2, 'driver', 'active', 1)
                RETURNING id
            `, [email, passwordHash]);
            userId = newUser.rows[0].id;
            console.log('   ✅ Created User with ID:', userId);
        }

        // 2. Create Driver Profile
        let driverId;
        const driverRes = await db.query("SELECT id FROM drivers WHERE user_id = $1", [userId]);

        if (driverRes.rows.length > 0) {
            driverId = driverRes.rows[0].id;
            console.log('   ℹ️  Driver profile exists with ID:', driverId);

            // Ensure status is active and availability is online/available
            await db.query("UPDATE drivers SET status = 'active', availability = 'available' WHERE id = $1", [driverId]);
        } else {
            const newDriver = await db.query(`
                INSERT INTO drivers (user_id, status, availability, current_lat, current_lng)
                VALUES ($1, 'active', 'available', 48.8566, 2.3522) -- Paris coordinates
                RETURNING id
            `, [userId]);
            driverId = newDriver.rows[0].id;
            console.log('   ✅ Created Driver profile with ID:', driverId);
        }

        // 3. Create Schedule (24/7 coverage)
        console.log('   📅 Setting 24/7 Schedule...');
        await db.query("DELETE FROM driver_schedules WHERE driver_id = $1", [driverId]);

        for (let day = 0; day <= 6; day++) {
            await db.query(`
                INSERT INTO driver_schedules (driver_id, day_of_week, start_time, end_time, is_active)
                VALUES ($1, $2, '00:00:00', '23:59:59', true)
            `, [driverId, day]);
        }
        console.log('   ✅ Schedule created for all 7 days.');

        // 4. Ensure Driver has a vehicle
        // Check if driver has a vehicle
        const vehicleCheck = await db.query("SELECT vehicle_id FROM drivers WHERE id = $1", [driverId]);
        if (!vehicleCheck.rows[0].vehicle_id) {
            console.log('   🚗 No vehicle assigned. Creating test vehicle...');
            const plate = 'AUTO-TEST-247';
            let vehicleId;
            const vehRes = await db.query("SELECT id FROM vehicles WHERE license_plate = $1", [plate]);
            if (vehRes.rows.length > 0) {
                vehicleId = vehRes.rows[0].id;
            } else {
                const newVeh = await db.query(`
                    INSERT INTO vehicles (tenant_id, make, model, year, license_plate, color, status, vehicle_type)
                    VALUES (1, 'Tesla', 'Model 3', 2024, $1, 'White', 'active', 'sedan')
                    RETURNING id
                `, [plate]);
                vehicleId = newVeh.rows[0].id;
            }
            await db.query("UPDATE drivers SET vehicle_id = $1 WHERE id = $2", [vehicleId, driverId]);
            console.log('   ✅ Vehicle assigned.');
        }

        console.log('\n🎉 TEST DRIVER READY');
        console.log('   Email: ' + email);
        console.log('   Pass:  driver123');
        console.log('   ID:    ' + driverId);

    } catch (err) {
        console.error('❌ Failed:', err.message);
    } finally {
        process.exit();
    }
}

createTestDriver();
