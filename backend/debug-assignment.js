const db = require('./config/database');
const assignmentService = require('./services/assignmentService');
const driverScheduleService = require('./services/driverScheduleService');

async function diagnoseAssignment() {
    console.log('🕵️‍♀️ DIAGNOSING PENDING BOOKINGS...\n');

    try {
        // 1. Find pending bookings
        const res = await db.query(`
            SELECT id, booking_reference, scheduled_pickup_time, status, assignment_method, vehicle_type, tenant_id
            FROM bookings 
            WHERE status = 'pending' 
            ORDER BY created_at DESC 
            LIMIT 5
        `);

        if (res.rows.length === 0) {
            console.log('✅ No pending bookings found.');
            return;
        }

        console.log(`Found ${res.rows.length} pending bookings. Checking the most recent one:`);

        const booking = res.rows[0];
        console.log(`\n📄 BOOKING: ${booking.booking_reference} (ID: ${booking.id})`);
        console.log(`   - Pickup: ${booking.scheduled_pickup_time}`);
        console.log(`   - Vehicle Type: ${booking.vehicle_type || 'any (defaults to sedan)'}`);
        console.log(`   - Tenant ID: ${booking.tenant_id}`);
        console.log(`   - Method: ${booking.assignment_method}`);

        // 2. Check Driver Availability Logic manually
        const vehicleType = booking.vehicle_type || 'sedan';
        const drivers = await driverScheduleService.getAvailableDrivers(
            booking.scheduled_pickup_time,
            vehicleType,
            booking.tenant_id
        );

        console.log(`\n🚙 ELIGIBLE DRIVERS FOUND: ${drivers.length}`);

        if (drivers.length === 0) {
            console.log('   ❌ No drivers found via getAvailableDrivers()');

            // Deep dive: Why?
            await analyzeWhyNoDrivers(booking.scheduled_pickup_time, vehicleType, booking.tenant_id);
        } else {
            console.log('   ✅ Drivers found:', drivers.map(d => d.id));

            // If drivers found, try assignment logic
            console.log('\n🔄 Attempting Dry-Run Assignment...');
            try {
                await assignmentService.assignBooking(booking.id);
                console.log('   🎉 Assignment script finished without error (check DB if it updated)');
            } catch (e) {
                console.log('   ❌ Assignment threw error:', e.message);
            }
        }

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        process.exit();
    }
}

async function analyzeWhyNoDrivers(pickupTime, vehicleType, tenantId) {
    const date = new Date(pickupTime);
    const dayOfWeek = date.getDay();
    const timeStr = date.toTimeString().split(' ')[0];

    console.log('\n🔎 DEEP DIVE DIAGNOSIS:');
    console.log(`   - Looking for: Day=${dayOfWeek}, Time=${timeStr}, Vehicle=${vehicleType}`);

    // Check 1: Any active drivers in tenant?
    const allDrivers = await db.query(
        "SELECT d.id, u.first_name, u.status as user_status, d.status as driver_status FROM drivers d JOIN users u ON d.user_id = u.id WHERE u.tenant_id = $1",
        [tenantId]
    );
    console.log(`   - Total drivers in tenant: ${allDrivers.rows.length}`);
    allDrivers.rows.forEach(d => console.log(`     > ID ${d.id}: User=${d.user_status}, Driver=${d.driver_status}`));

    // Check 2: Schedule for test driver
    const driverId = allDrivers.rows[0]?.id; // Just check first one
    if (driverId) {
        const sched = await db.query(
            "SELECT * FROM driver_schedules WHERE driver_id = $1 AND day_of_week = $2",
            [driverId, dayOfWeek]
        );
        console.log(`   - Schedule for Driver ${driverId} on Day ${dayOfWeek}:`);
        if (sched.rows.length === 0) {
            console.log('     ❌ NO SCHEDULE ENTRY');
        } else {
            const s = sched.rows[0];
            console.log(`     Found: ${s.start_time} - ${s.end_time} (Active: ${s.is_active})`);

            if (timeStr < s.start_time || timeStr > s.end_time) console.log('     ❌ Time mismatch');
            if (!s.is_active) console.log('     ❌ Schedule inactive');
        }
    }
}

diagnoseAssignment();
