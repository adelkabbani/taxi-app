require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function runGenerators() {
    const client = await pool.connect();
    console.log('🔥 3-DAY HIGH-VOLUME SIMULATION: Generation started...\n');
    let tourIds = [];

    try {
        const tenantRes = await client.query("SELECT id FROM tenants LIMIT 1");
        if (tenantRes.rowCount === 0) throw new Error("No tenants found.");
        const tenantId = tenantRes.rows[0].id;

        // Clear previous SIM bookings just in case
        const deleteRes = await client.query("DELETE FROM bookings WHERE booking_reference LIKE 'SIM-%'");
        console.log(`🗑️ Deleted ${deleteRes.rowCount} existing SIM- bookings...`);

        const toursToGenerate = [];

        // 1. April 14, 2026 (Today): 7 tours, start 18:00, every 30 mins
        for (let i = 0; i < 7; i++) {
            const time = `2026-04-14 ${18 + Math.floor(i / 2)}:${i % 2 === 0 ? '00' : '30'}:00`;
            toursToGenerate.push(time);
        }

        // 2. April 15, 2026 (Tomorrow): 7 tours spread (08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00)
        [8, 10, 12, 14, 16, 18, 20].forEach(hour => {
            const time = `2026-04-15 ${hour.toString().padStart(2, '0')}:00:00`;
            toursToGenerate.push(time);
        });

        // 3. April 16, 2026 (Day After): 6 tours morning rush (06:00, 07:00, 08:00, 09:00, 10:00, 11:00)
        [6, 7, 8, 9, 10, 11].forEach(hour => {
            const time = `2026-04-16 ${hour.toString().padStart(2, '0')}:00:00`;
            toursToGenerate.push(time);
        });

        const pickupLocations = [
            { name: 'Berlin Brandenburg Airport (BER)', lat: 52.3667, lng: 13.5033 },
            { name: 'Berlin Hauptbahnhof', lat: 52.5251, lng: 13.3694 },
            { name: 'Alexanderplatz', lat: 52.5219, lng: 13.4132 }
        ];
        const dropoffLocations = [
            { name: 'Hotel Adlon', lat: 52.5163, lng: 13.3778 },
            { name: 'Ritz-Carlton', lat: 52.5094, lng: 13.3752 }
        ];

        let count = 1;
        for (const scheduledTime of toursToGenerate) {
            const pickup = pickupLocations[Math.floor(Math.random() * pickupLocations.length)];
            const dropoff = dropoffLocations[Math.floor(Math.random() * dropoffLocations.length)];
            const fare = (75 + Math.random() * 85).toFixed(2); // randomized 75.00 to 160.00
            
            // Format date for reference: YYYYMMDD
            const datePart = scheduledTime.split(' ')[0].replace(/-/g, '');
            const ref = `SIM-${datePart}-${count.toString().padStart(3, '0')}`;
            
            await client.query(`
                INSERT INTO bookings (
                    tenant_id, booking_reference, passenger_name, passenger_phone,
                    source, pickup_address, pickup_lat, pickup_lng,
                    dropoff_address, dropoff_lat, dropoff_lng,
                    scheduled_pickup_time, fare_estimate, status, payment_method, vehicle_type
                ) VALUES ($1, $2, $3, $4, 'api', $5, $6, $7, $8, $9, $10, $11, $12, 'pending', 'card', 'economy_sedan')
            `, [
                tenantId, ref, `Sim Passenger ${count}`, `+49123${count.toString().padStart(4, '0')}`,
                pickup.name, pickup.lat, pickup.lng,
                dropoff.name, dropoff.lat, dropoff.lng,
                scheduledTime, fare
            ]);
            tourIds.push(ref);
            count++;
        }

        console.log(`\n✅ Successfully generated ${tourIds.length} high-fire tours!`);
        console.log('List of generated Tour IDs:');
        tourIds.forEach(id => console.log(`   👉 ${id}`));

    } catch (e) {
         console.error('❌ Data generation failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

runGenerators();
