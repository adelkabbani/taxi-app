require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function runReset() {
    const client = await pool.connect();
    console.log('🔥 OPERATION HEAVY FIRE: Resetting Environment...\n');

    try {
        // 1. Ensure Admin User exists with correct password
        console.log('👤 Synchronizing Admin account...');
        const adminPasswordHash = await bcrypt.hash('admin123', 10);
        await client.query(`
            INSERT INTO users (tenant_id, email, phone, password_hash, first_name, last_name, role)
            SELECT id, 'admin@taxi.com', '+49000000000', $1, 'Super', 'Admin', 'admin' FROM tenants LIMIT 1
            ON CONFLICT (tenant_id, email) DO UPDATE SET password_hash = $1
        `, [adminPasswordHash]);

        // 2. DELETE bookings for April 9th, 10th, 11th
        console.log('🗑️ Purging bookings for Apr 9, 10, 11...');
        const deleteRes = await client.query(`
            DELETE FROM bookings 
            WHERE scheduled_pickup_time >= '2026-04-09 00:00:00' 
              AND scheduled_pickup_time <= '2026-04-11 23:59:59'
        `);
        console.log(`   ✓ Removed ${deleteRes.rowCount} bookings.`);

        // 2. RESET metrics and passwords for target drivers (and others)
        console.log('🧹 Resetting driver metrics and passwords...');
        const targetEmails = ['driver6@taxi.com', 'driver11@taxi.com', 'driver21@taxi.com'];
        const newPasswordHash = await bcrypt.hash('warrior2026', 10);

        // Update target drivers passwords
        await client.query(`
            UPDATE users SET password_hash = $1 
            WHERE email = ANY($2)
        `, [newPasswordHash, targetEmails]);


        // Reset all metrics
        await client.query(`
            UPDATE driver_metrics 
            SET rejected_bookings = 0, 
                accepted_bookings = 0, 
                total_bookings = 0, 
                acceptance_rate = 100.0,
                cancelled_bookings = 0,
                late_arrivals = 0,
                no_shows = 0,
                rejected_bookings_count = 0
        `);
        
        // Clear exclusions
        await client.query(`UPDATE bookings SET excluded_drivers = '{}'`);

        console.log('   ✓ Metrics and passwords reset (New Pass: warrior2026).');

        // 3. SEED 300 tours (100 per day)
        console.log('🌱 Seeding 300 fresh tours...');
        
        const tenantRes = await client.query("SELECT id FROM tenants LIMIT 1");
        const tenantId = tenantRes.rows[0].id;

        const pickupLocations = [
            { name: 'Berlin Brandenburg Airport (BER)', lat: 52.3667, lng: 13.5033 },
            { name: 'Berlin Hauptbahnhof', lat: 52.5251, lng: 13.3694 },
            { name: 'Alexanderplatz', lat: 52.5219, lng: 13.4132 },
            { name: 'Brandenburg Gate', lat: 52.5163, lng: 13.3777 },
            { name: 'Kurfürstendamm 21', lat: 52.5037, lng: 13.3295 }
        ];

        const dropoffLocations = [
            { name: 'Hotel Adlon', lat: 52.5163, lng: 13.3778 },
            { name: 'Ritz-Carlton', lat: 52.5094, lng: 13.3752 },
            { name: 'East Side Gallery', lat: 52.5050, lng: 13.4397 },
            { name: 'Olympiastadion', lat: 52.5146, lng: 13.2395 }
        ];

        let seedCount = 0;
        const days = ['2026-04-09', '2026-04-10', '2026-04-11'];

        for (const day of days) {
            for (let i = 0; i < 100; i++) {
                const pickup = pickupLocations[Math.floor(Math.random() * pickupLocations.length)];
                const dropoff = dropoffLocations[Math.floor(Math.random() * dropoffLocations.length)];
                const hour = Math.floor(Math.random() * 24);
                const minute = Math.floor(Math.random() * 60);
                const scheduledTime = `${day} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
                
                const ref = `SIM-${day.replace(/-/g, '')}-${i.toString().padStart(3, '0')}`;
                const fare = (50 + Math.random() * 100).toFixed(2); // Ensure all are above 50 to avoid quarantine

                await client.query(`
                    INSERT INTO bookings (
                        tenant_id, booking_reference, passenger_name, passenger_phone,
                        source, pickup_address, pickup_lat, pickup_lng,
                        dropoff_address, dropoff_lat, dropoff_lng,
                        scheduled_pickup_time, fare_estimate, status, payment_method
                    ) VALUES ($1, $2, $3, $4, 'api', $5, $6, $7, $8, $9, $10, $11, $12, 'pending', 'cash')
                    ON CONFLICT (booking_reference) DO NOTHING
                `, [
                    tenantId, ref, `Sim Passenger ${i}`, `+49123${seedCount}`,
                    pickup.name, pickup.lat, pickup.lng,
                    dropoff.name, dropoff.lat, dropoff.lng,
                    scheduledTime, fare
                ]);
                seedCount++;
            }
        }

        console.log(`   ✓ Seeded ${seedCount} tours.`);

        await client.query('COMMIT');
        console.log('\n✅ RESET COMPLETE. System ready for War Games.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ RESET FAILED:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

runReset();
