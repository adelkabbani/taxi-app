const db = require('./config/database');
const assignmentService = require('./services/assignmentService');

async function testAutoAssignment() {
    console.log('🤖 Testing Auto-Assignment Flow...\n');

    try {
        // 1. Create a Booking (pending, scheduled for 30 mins from now)
        const pickupTime = new Date(Date.now() + 30 * 60000);

        console.log('1️⃣  Creating Test Booking for:', pickupTime.toISOString());

        const bookingRes = await db.query(`
            INSERT INTO bookings (
                tenant_id, passenger_name, pickup_address, dropoff_address, 
                scheduled_pickup_time, status, vehicle_type, estimated_duration_minutes, 
                assignment_method, auto_assignment_attempts
            )
            VALUES (1, 'Test Passenger', '123 Start St', '456 End St', $1, 'pending', 'sedan', 30, 'auto', 0)
            RETURNING id, booking_reference
        `, [pickupTime]);

        const booking = bookingRes.rows[0];
        console.log(`   ✅ Booking Created: ID ${booking.id} (${booking.booking_reference})`);

        // 2. Trigger Assignment
        console.log('\n2️⃣  Triggering Assignment Logic...');
        const result = await assignmentService.assignBooking(booking.id);

        if (result && result.driver_id) {
            console.log('   ✅ ASSIGNMENT SUCCESSFUL!');
            console.log('   Driver ID:', result.driver_id);
            console.log('   Status:', result.status);
        } else {
            console.log('   ❌ Assignment Failed (No result returned)');
        }

    } catch (err) {
        console.log('   ❌ Error:', err.message);
        if (err.stack) console.log(err.stack);
    } finally {
        // Cleanup? Maybe keep it for inspection
        console.log('\n🏁 Test Complete');
        process.exit();
    }
}

testAutoAssignment();
