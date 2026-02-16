require('dotenv').config();
const db = require('./config/database');

async function seed() {
    console.log('Seeding 10 fake bookings for Tenant 3...');
    const tenantId = 3;
    const adminId = 6; // We've seen this ID used before for admin

    // Pickup addresses for variety
    const addresses = [
        'Alexanderplatz, Berlin',
        'Brandenburg Gate, Berlin',
        'Checkpoint Charlie, Berlin',
        'Potsdamer Platz, Berlin',
        'Kurfürstendamm, Berlin',
        'Prenzlauer Berg, Berlin',
        'Kreuzberg, Berlin',
        'Charlottenburg Palace, Berlin',
        'East Side Gallery, Berlin',
        'Tiergarten, Berlin'
    ];

    const now = new Date();

    try {
        for (let i = 0; i < 10; i++) {
            const reference = `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
            // Schedule them between 2 and 22 hours from now to fit in the 24h auto-assignment window
            const scheduledTime = new Date(now.getTime() + (i + 2) * 60 * 60 * 1000);

            const bookingResult = await db.query(
                `INSERT INTO bookings (
                    tenant_id, booking_reference, passenger_name, passenger_phone,
                    pickup_address, pickup_lat, pickup_lng,
                    dropoff_address, scheduled_pickup_time, status,
                    source, payment_method, created_by_user_id, assignment_method
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING id`,
                [
                    tenantId,
                    reference,
                    `Test Passenger ${i + 1}`,
                    `+49151000000${i}`,
                    addresses[i],
                    '52.5200',
                    '13.4050',
                    'Berlin Airport (BER)',
                    scheduledTime,
                    'pending',
                    'manual',
                    'cash',
                    adminId,
                    'auto' // Set to auto so the scheduler picks them up
                ]
            );

            const bookingId = bookingResult.rows[0].id;

            // Add requirements (vehicle type)
            // Mixing up vehicle types to test filters
            const vehicleType = i % 3 === 0 ? 'van' : (i % 3 === 1 ? 'luxury' : 'sedan');

            await db.query(
                `INSERT INTO booking_requirements (booking_id, vehicle_type) VALUES ($1, $2)`,
                [bookingId, vehicleType]
            );

            console.log(`Created Booking ${i + 1}: ${reference} (${vehicleType}) scheduled for ${scheduledTime.toISOString()}`);
        }
        console.log('✅ Successfully seeded 10 bookings.');
    } catch (error) {
        console.error('❌ Failed to seed bookings:', error.message);
    } finally {
        process.exit();
    }
}

seed();
