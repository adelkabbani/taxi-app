const { Pool } = require('pg');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function seedAll() {
    const client = await pool.connect();
    console.log('🌱 Starting comprehensive seed...\n');

    try {
        // === TENANT ===
        console.log('📦 Creating tenant...');
        let tenantId;
        const tenantRes = await client.query("SELECT id FROM tenants WHERE slug = 'default' OR slug = 'berlin-taxi' LIMIT 1");
        if (tenantRes.rows.length === 0) {
            const t = await client.query(
                "INSERT INTO tenants (name, slug, timezone) VALUES ('Berlin Taxi Service', 'berlin-taxi', 'Europe/Berlin') RETURNING id"
            );
            tenantId = t.rows[0].id;
        } else {
            tenantId = tenantRes.rows[0].id;
        }
        console.log(`   ✓ Tenant ID: ${tenantId}\n`);

        // === ADMIN USER ===
        console.log('👤 Creating admin user...');
        const adminPassword = await bcrypt.hash('admin123', 10);
        const adminRes = await client.query(
            `INSERT INTO users (tenant_id, email, phone, password_hash, first_name, last_name, role)
             VALUES ($1, 'admin@taxi.com', '+49100000000', $2, 'Admin', 'User', 'admin')
             ON CONFLICT (tenant_id, email) DO UPDATE SET password_hash = $2
             RETURNING id`,
            [tenantId, adminPassword]
        );
        console.log(`   ✓ Admin user ID: ${adminRes.rows[0].id}\n`);

        // === PARTNERS ===
        console.log('🤝 Creating partners...');
        const partners = [
            { name: 'Booking.com', email: 'transfers@booking.com', phone: '+31207125555', commission: 15.00 },
            { name: 'Welcome Pickups', email: 'api@welcomepickups.com', phone: '+302106829900', commission: 12.00 },
            { name: 'GetYourGuide', email: 'partners@getyourguide.com', phone: '+49306446670', commission: 12.00 },
            { name: 'Viator', email: 'transfers@viator.com', phone: '+18884656855', commission: 10.00 },
            { name: 'Hotel Adlon', email: 'concierge@adlon.de', phone: '+493022610', commission: 8.00 },
            { name: 'Ritz-Carlton Berlin', email: 'concierge@ritzcarlton.de', phone: '+493033777', commission: 8.00 }
        ];

        for (const p of partners) {
            const apiKey = `pk_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
            const partnerRes = await client.query(
                `INSERT INTO partners (tenant_id, name, contact_email, contact_phone, api_key)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT DO NOTHING
                 RETURNING id`,
                [tenantId, p.name, p.email, p.phone, apiKey]
            );

            if (partnerRes.rows.length > 0) {
                await client.query(
                    `INSERT INTO partner_pricing_rules (partner_id, commission_percentage, free_wait_minutes)
                     VALUES ($1, $2, 15)
                     ON CONFLICT (partner_id) DO NOTHING`,
                    [partnerRes.rows[0].id, p.commission]
                );
                console.log(`   ✓ ${p.name} (${p.commission}% commission)`);
            }
        }
        console.log('');

        // === DRIVERS ===
        console.log('🚗 Creating drivers...');
        const driverPassword = await bcrypt.hash('driver123', 10);
        const drivers = [
            { first: 'Hans', last: 'Mueller', phone: '+49151111111', plate: 'B-TX 1001', type: 'sedan', lat: 52.3667, lng: 13.5033 },
            { first: 'Klaus', last: 'Schmidt', phone: '+49151111112', plate: 'B-TX 1002', type: 'van', lat: 52.5200, lng: 13.4050 },
            { first: 'Peter', last: 'Weber', phone: '+49151111113', plate: 'B-TX 1003', type: 'business_van', lat: 52.5100, lng: 13.3900 },
            { first: 'Michael', last: 'Fischer', phone: '+49151111114', plate: 'B-TX 1004', type: 'luxury', lat: 52.5070, lng: 13.4245 },
            { first: 'Thomas', last: 'Wagner', phone: '+49151111115', plate: 'B-TX 1005', type: 'sedan', lat: 52.4970, lng: 13.4500 }
        ];

        for (const d of drivers) {
            // Create user
            const userRes = await client.query(
                `INSERT INTO users (tenant_id, email, phone, password_hash, first_name, last_name, role)
                 VALUES ($1, $2, $3, $4, $5, $6, 'driver')
                 ON CONFLICT (tenant_id, phone) DO UPDATE SET first_name = $5, last_name = $6
                 RETURNING id`,
                [tenantId, `${d.first.toLowerCase()}.${d.last.toLowerCase()}@taxi.com`, d.phone, driverPassword, d.first, d.last]
            );
            const userId = userRes.rows[0].id;

            // Create vehicle
            const vehicleRes = await client.query(
                `INSERT INTO vehicles (tenant_id, license_plate, vehicle_type, make, model, year, color)
                 VALUES ($1, $2, $3, 'Mercedes-Benz', 'E-Class', 2023, 'Black')
                 ON CONFLICT (tenant_id, license_plate) DO UPDATE SET vehicle_type = $3
                 RETURNING id`,
                [tenantId, d.plate, d.type]
            );
            const vehicleId = vehicleRes.rows[0].id;

            // Create driver profile
            const driverRes = await client.query(
                `INSERT INTO drivers (user_id, vehicle_id, license_number, availability, current_lat, current_lng, location_updated_at)
                 VALUES ($1, $2, $3, 'available', $4, $5, NOW())
                 ON CONFLICT (user_id) DO UPDATE SET availability = 'available', current_lat = $4, current_lng = $5, location_updated_at = NOW()
                 RETURNING id`,
                [userId, vehicleId, `LIC-${d.plate.replace(/\s/g, '')}`, d.lat, d.lng]
            );
            const driverId = driverRes.rows[0].id;

            // Create driver metrics
            await client.query(
                `INSERT INTO driver_metrics (driver_id, acceptance_rate, total_bookings, accepted_bookings)
                 VALUES ($1, 95.0, 100, 95)
                 ON CONFLICT (driver_id) DO NOTHING`,
                [driverId]
            );

            console.log(`   ✓ ${d.first} ${d.last} - ${d.plate} (${d.type})`);
        }
        console.log('');

        // === SAMPLE BOOKINGS ===
        console.log('📋 Creating sample bookings...');

        // Get partner IDs
        const bookingComRes = await client.query("SELECT id FROM partners WHERE name = 'Booking.com' LIMIT 1");
        const welcomeRes = await client.query("SELECT id FROM partners WHERE name = 'Welcome Pickups' LIMIT 1");
        const hotelRes = await client.query("SELECT id FROM partners WHERE name = 'Hotel Adlon' LIMIT 1");
        const gygRes = await client.query("SELECT id FROM partners WHERE name = 'GetYourGuide' LIMIT 1");

        const bookingComId = bookingComRes.rows[0]?.id;
        const welcomeId = welcomeRes.rows[0]?.id;
        const hotelId = hotelRes.rows[0]?.id;
        const gygId = gygRes.rows[0]?.id;

        // Get driver IDs
        const driverIdRes = await client.query("SELECT id FROM drivers LIMIT 3");
        const driverId = driverIdRes.rows[0]?.id;
        const driverId2 = driverIdRes.rows[1]?.id || driverId;
        const driverId3 = driverIdRes.rows[2]?.id || driverId;

        const sampleBookings = [
            // Booking.com - Airport pickup
            {
                ref: `TX-${Date.now()}-A1`,
                passenger_name: 'John Smith',
                passenger_phone: '+447911123456',
                source: 'booking.com',
                pickup: 'Berlin Brandenburg Airport (BER), Terminal 1',
                pickup_lat: 52.3667,
                pickup_lng: 13.5033,
                dropoff: 'Hotel Adlon Kempinski, Unter den Linden 77',
                dropoff_lat: 52.5163,
                dropoff_lng: 13.3778,
                partner_id: bookingComId,
                status: 'pending',
                fare: 55.00,
                passenger_notes: 'Flight LH1234, landing 14:30. 2 passengers, 3 suitcases.',
                scheduled: new Date(Date.now() + 2 * 60 * 60 * 1000)
            },
            // Welcome Pickups - Airport transfer
            {
                ref: `TX-${Date.now()}-W1`,
                passenger_name: 'Sophie Laurent',
                passenger_phone: '+33612345678',
                source: 'welcome',
                pickup: 'Berlin Brandenburg Airport (BER), Terminal 2',
                pickup_lat: 52.3651,
                pickup_lng: 13.5089,
                dropoff: 'Park Inn by Radisson, Alexanderplatz',
                dropoff_lat: 52.5222,
                dropoff_lng: 13.4133,
                partner_id: welcomeId,
                status: 'assigned',
                driver_id: driverId2,
                fare: 48.00,
                passenger_notes: 'Flight AF1234 | Passengers: 2 | Luggage: 2 large suitcases',
                scheduled: new Date(Date.now() + 3 * 60 * 60 * 1000)
            },
            // Welcome Pickups - Another pickup
            {
                ref: `TX-${Date.now()}-W2`,
                passenger_name: 'James Wilson',
                passenger_phone: '+442071234567',
                source: 'welcome',
                pickup: 'Berlin Hauptbahnhof',
                pickup_lat: 52.5251,
                pickup_lng: 13.3694,
                dropoff: 'Soho House Berlin, Torstraße',
                dropoff_lat: 52.5289,
                dropoff_lng: 13.4110,
                partner_id: welcomeId,
                status: 'pending',
                fare: 22.00,
                passenger_notes: 'Train arriving at 16:00 | 1 passenger | 1 luggage',
                scheduled: new Date(Date.now() + 5 * 60 * 60 * 1000)
            },
            // Hotel Adlon - VIP transfer
            {
                ref: `TX-${Date.now()}-A2`,
                passenger_name: 'Maria Gonzalez',
                passenger_phone: '+34612345678',
                source: 'hotel',
                pickup: 'Ritz-Carlton Berlin, Potsdamer Platz 3',
                pickup_lat: 52.5094,
                pickup_lng: 13.3752,
                dropoff: 'Berlin Brandenburg Airport (BER)',
                dropoff_lat: 52.3667,
                dropoff_lng: 13.5033,
                partner_id: hotelId,
                status: 'assigned',
                driver_id: driverId,
                fare: 52.00,
                passenger_notes: 'VIP guest. Please arrive 10 min early.',
                scheduled: new Date(Date.now() + 1 * 60 * 60 * 1000)
            },
            // GetYourGuide - Tour pickup
            {
                ref: `TX-${Date.now()}-G1`,
                passenger_name: 'Chen Wei',
                passenger_phone: '+8613812345678',
                source: 'getyourguide',
                pickup: 'Brandenburg Gate',
                pickup_lat: 52.5163,
                pickup_lng: 13.3777,
                dropoff: 'Sachsenhausen Memorial',
                dropoff_lat: 52.7630,
                dropoff_lng: 13.2627,
                partner_id: gygId,
                status: 'accepted',
                driver_id: driverId3,
                fare: 75.00,
                passenger_notes: 'Tour group pickup. 4 passengers. Round trip.',
                scheduled: new Date(Date.now() + 90 * 60 * 1000)
            },
            // Manual booking - Phone call
            {
                ref: `TX-${Date.now()}-M1`,
                passenger_name: 'Max Mustermann',
                passenger_phone: '+49171234567',
                source: 'phone',
                pickup: 'Alexanderplatz, Berlin',
                pickup_lat: 52.5219,
                pickup_lng: 13.4132,
                dropoff: 'Olympiastadion Berlin',
                dropoff_lat: 52.5146,
                dropoff_lng: 13.2395,
                partner_id: null,
                status: 'pending',
                fare: 35.00,
                passenger_notes: 'Going to soccer match. Need spacious vehicle.',
                scheduled: new Date(Date.now() + 4 * 60 * 60 * 1000)
            },
            // Booking.com - Completed
            {
                ref: `TX-${Date.now()}-A4`,
                passenger_name: 'Emma Johnson',
                passenger_phone: '+12025551234',
                source: 'booking.com',
                pickup: 'Checkpoint Charlie, Berlin',
                pickup_lat: 52.5075,
                pickup_lng: 13.3904,
                dropoff: 'East Side Gallery',
                dropoff_lat: 52.5050,
                dropoff_lng: 13.4397,
                partner_id: bookingComId,
                status: 'completed',
                driver_id: driverId,
                fare: 18.00,
                fare_final: 18.00,
                passenger_notes: 'Tourist trip',
                scheduled: new Date(Date.now() - 2 * 60 * 60 * 1000)
            },
            // API booking - No show
            {
                ref: `TX-${Date.now()}-A5`,
                passenger_name: 'Yuki Tanaka',
                passenger_phone: '+819012345678',
                source: 'api',
                pickup: 'Friedrichstraße Station',
                pickup_lat: 52.5200,
                pickup_lng: 13.3869,
                dropoff: 'Sony Center, Berlin',
                dropoff_lat: 52.5099,
                dropoff_lng: 13.3731,
                partner_id: null,
                status: 'no_show_requested',
                driver_id: driverId,
                fare: 15.00,
                passenger_notes: 'Business meeting',
                scheduled: new Date(Date.now() - 30 * 60 * 1000)
            },
            // Manual admin entry
            {
                ref: `TX-${Date.now()}-M2`,
                passenger_name: 'Anna Schmidt',
                passenger_phone: '+49152987654',
                source: 'manual',
                pickup: 'KaDeWe, Tauentzienstraße',
                pickup_lat: 52.5018,
                pickup_lng: 13.3407,
                dropoff: 'Charlottenburg Palace',
                dropoff_lat: 52.5206,
                dropoff_lng: 13.2954,
                partner_id: null,
                status: 'started',
                driver_id: driverId2,
                fare: 25.00,
                passenger_notes: 'Regular customer. Prefers quiet driver.',
                scheduled: new Date(Date.now() - 15 * 60 * 1000)
            }
        ];

        for (const b of sampleBookings) {
            await client.query(
                `INSERT INTO bookings (
                    tenant_id, booking_reference, partner_id, driver_id,
                    passenger_name, passenger_phone, source,
                    pickup_address, pickup_lat, pickup_lng,
                    dropoff_address, dropoff_lat, dropoff_lng,
                    scheduled_pickup_time, fare_estimate, fare_final,
                    passenger_notes, status, payment_method
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'cash')
                 ON CONFLICT (booking_reference) DO NOTHING`,
                [
                    tenantId, b.ref, b.partner_id || null, b.driver_id || null,
                    b.passenger_name, b.passenger_phone, b.source,
                    b.pickup, b.pickup_lat, b.pickup_lng,
                    b.dropoff, b.dropoff_lat, b.dropoff_lng,
                    b.scheduled, b.fare, b.fare_final || null,
                    b.passenger_notes, b.status
                ]
            );
            console.log(`   ✓ ${b.ref} - ${b.status} (${b.source})`);
        }

        console.log('\n✅ Seed completed successfully!\n');
        console.log('📝 Login credentials:');
        console.log('   Admin: admin@taxi.com / admin123');
        console.log('   Driver: hans.mueller@taxi.com / driver123');
        console.log('');

        process.exit(0);
    } catch (err) {
        console.error('❌ Seed ERROR:', err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

seedAll();
