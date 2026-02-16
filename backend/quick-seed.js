const { Pool } = require('pg');
require('dotenv').config();
const bcrypt = require('bcrypt');
const fs = require('fs');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

const log = (msg) => {
    console.log(msg);
    fs.appendFileSync('seed-quick.log', msg + '\n');
};

async function quickSeed() {
    const client = await pool.connect();

    if (fs.existsSync('seed-quick.log')) fs.unlinkSync('seed-quick.log');

    log('🌱 Quick Seed Starting...\n');

    try {
        // Get tenant
        const tenantRes = await client.query("SELECT id FROM tenants LIMIT 1");
        const tenantId = tenantRes.rows[0]?.id || 1;
        log(`Tenant ID: ${tenantId}`);

        // Create Welcome Pickups partner if it doesn't exist
        log('\n📦 Creating partners...');
        const partners = [
            { name: 'Booking.com', commission: 15 },
            { name: 'Welcome Pickups', commission: 12 },
            { name: 'GetYourGuide', commission: 12 },
            { name: 'Hotel Adlon', commission: 8 }
        ];

        for (const p of partners) {
            const apiKey = `pk_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
            await client.query(
                `INSERT INTO partners (tenant_id, name, api_key) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT DO NOTHING`,
                [tenantId, p.name, apiKey]
            );
            log(`  ✓ ${p.name}`);
        }

        // Get partner IDs
        const bcRes = await client.query("SELECT id FROM partners WHERE name = 'Booking.com' LIMIT 1");
        const wpRes = await client.query("SELECT id FROM partners WHERE name = 'Welcome Pickups' LIMIT 1");
        const gygRes = await client.query("SELECT id FROM partners WHERE name = 'GetYourGuide' LIMIT 1");
        const hotelRes = await client.query("SELECT id FROM partners WHERE name = 'Hotel Adlon' LIMIT 1");

        const bookingComId = bcRes.rows[0]?.id;
        const welcomeId = wpRes.rows[0]?.id;
        const gygId = gygRes.rows[0]?.id;
        const hotelId = hotelRes.rows[0]?.id;

        log(`\nPartner IDs: Booking.com=${bookingComId}, Welcome=${welcomeId}, GYG=${gygId}, Hotel=${hotelId}`);

        // Get driver ID
        const driverRes = await client.query("SELECT id FROM drivers LIMIT 1");
        const driverId = driverRes.rows[0]?.id;
        log(`Driver ID: ${driverId}`);

        // Create sample bookings
        log('\n📋 Creating sample bookings...');

        const bookings = [
            { ref: `TX-${Date.now()}-B1`, name: 'John Smith', phone: '+447911123456', source: 'booking.com', partner: bookingComId, status: 'pending', pickup: 'Berlin Airport BER', dropoff: 'Hotel Adlon', fare: 55 },
            { ref: `TX-${Date.now()}-W1`, name: 'Sophie Laurent', phone: '+33612345678', source: 'welcome', partner: welcomeId, status: 'assigned', driver: driverId, pickup: 'Berlin Airport BER T2', dropoff: 'Park Inn Alexanderplatz', fare: 48 },
            { ref: `TX-${Date.now()}-W2`, name: 'James Wilson', phone: '+442071234567', source: 'welcome', partner: welcomeId, status: 'pending', pickup: 'Berlin Hauptbahnhof', dropoff: 'Soho House Berlin', fare: 22 },
            { ref: `TX-${Date.now()}-G1`, name: 'Chen Wei', phone: '+8613812345678', source: 'getyourguide', partner: gygId, status: 'accepted', driver: driverId, pickup: 'Brandenburg Gate', dropoff: 'Sachsenhausen', fare: 75 },
            { ref: `TX-${Date.now()}-H1`, name: 'Maria Gonzalez', phone: '+34612345678', source: 'hotel', partner: hotelId, status: 'assigned', driver: driverId, pickup: 'Ritz-Carlton Berlin', dropoff: 'Berlin Airport', fare: 52 },
            { ref: `TX-${Date.now()}-P1`, name: 'Max Mustermann', phone: '+49171234567', source: 'phone', partner: null, status: 'pending', pickup: 'Alexanderplatz', dropoff: 'Olympiastadion', fare: 35 },
            { ref: `TX-${Date.now()}-M1`, name: 'Anna Schmidt', phone: '+49152987654', source: 'manual', partner: null, status: 'started', driver: driverId, pickup: 'KaDeWe', dropoff: 'Charlottenburg Palace', fare: 25 },
            { ref: `TX-${Date.now()}-A1`, name: 'Yuki Tanaka', phone: '+819012345678', source: 'api', partner: null, status: 'no_show_requested', driver: driverId, pickup: 'Friedrichstraße', dropoff: 'Sony Center', fare: 15 }
        ];

        for (const b of bookings) {
            await client.query(
                `INSERT INTO bookings (
                    tenant_id, booking_reference, passenger_name, passenger_phone, 
                    source, partner_id, driver_id, status,
                    pickup_address, pickup_lat, pickup_lng,
                    dropoff_address, dropoff_lat, dropoff_lng,
                    fare_estimate, payment_method, scheduled_pickup_time
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 52.52, 13.40, $10, 52.51, 13.38, $11, 'cash', NOW() + interval '1 hour')
                ON CONFLICT (booking_reference) DO NOTHING`,
                [tenantId, b.ref, b.name, b.phone, b.source, b.partner, b.driver || null, b.status, b.pickup, b.dropoff, b.fare]
            );
            log(`  ✓ ${b.ref} - ${b.source} - ${b.status}`);
        }

        log('\n✅ Quick seed completed!');
        log('\nRefresh your browser to see the bookings with different source badges.');

    } catch (err) {
        log('❌ ERROR: ' + err.message);
        log(err.stack);
    } finally {
        client.release();
        await pool.end();
        process.exit(0);
    }
}

quickSeed();
