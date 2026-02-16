const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

// Load env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

const fs = require('fs');
function log(msg) {
    console.log(msg);
    fs.appendFileSync('seed-debug.log', msg + '\n');
}

async function seed() {
    const client = await pool.connect();

    try {
        if (fs.existsSync('seed-debug.log')) fs.unlinkSync('seed-debug.log');
        log('🌱 Starting database seed...');
        log(`Connecting to database: ${process.env.DB_NAME || 'taxi_dispatch'} on ${process.env.DB_HOST || 'localhost'}`);
        await client.query('BEGIN');

        // 1. Create Default Tenant
        log('Creating tenant...');
        const tenantRes = await client.query(`
      INSERT INTO tenants (name, slug, timezone)
      VALUES ('Berlin Taxi Co', 'berlin-taxi', 'Europe/Berlin')
      ON CONFLICT DO NOTHING
      RETURNING id
    `);

        // Get tenant ID (either inserted or existing)
        let tenantId;
        if (tenantRes.rows.length > 0) {
            tenantId = tenantRes.rows[0].id;
        } else {
            const existing = await client.query("SELECT id FROM tenants WHERE slug = 'berlin-taxi'");
            tenantId = existing.rows[0].id;
        }

        // 2. Create Admin User
        log('Creating admin user...');
        const adminPass = await bcrypt.hash('admin123', 10);
        await client.query(`
      INSERT INTO users (tenant_id, email, phone, password_hash, first_name, last_name, role, status)
      VALUES ($1, 'admin@taxi.com', '+491111111111', $2, 'System', 'Admin', 'admin', 'active')
      ON CONFLICT (email, tenant_id) DO NOTHING
    `, [tenantId, adminPass]);

        // 3. Create Drivers & Vehicles
        log('Creating drivers...');
        const driverPass = await bcrypt.hash('driver123', 10);

        const drivers = [
            { first: 'Hans', last: 'Mueller', phone: '+49222222222', plate: 'B-TX 1001', lat: 52.3667, lng: 13.5033, type: 'sedan' }, // Airport
            { first: 'Klaus', last: 'Weber', phone: '+49333333333', plate: 'B-TX 1002', lat: 52.5200, lng: 13.4050, type: 'van' }, // Center
            { first: 'Sophie', last: 'Schmidt', phone: '+49444444444', plate: 'B-TX 1003', lat: 52.5000, lng: 13.3500, type: 'sedan' }, // West (fixed from electric)
            { first: 'Mehmet', last: 'Yilmaz', phone: '+49555555555', plate: 'B-TX 1004', lat: 52.4500, lng: 13.5500, type: 'sedan' }, // East
            { first: 'Anna', last: 'Fischer', phone: '+49666666666', plate: 'B-TX 1005', lat: 52.3800, lng: 13.5200, type: 'luxury' } // Airport Nearby
        ];

        for (const d of drivers) {
            // Check if driver user already exists (to prevent duplicate key error on re-run)
            const existingUser = await client.query(`SELECT id FROM users WHERE email = $1`, [`${d.first.toLowerCase()}.driver@taxi.com`]);

            let userId;
            if (existingUser.rows.length === 0) {
                // Create User
                const userRes = await client.query(`
          INSERT INTO users (tenant_id, email, phone, password_hash, first_name, last_name, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, 'driver', 'active')
          RETURNING id
        `, [tenantId, `${d.first.toLowerCase()}.driver@taxi.com`, d.phone, driverPass, d.first, d.last]);
                userId = userRes.rows[0].id;
                log(`Created user ${d.first} (ID: ${userId})`);
            } else {
                userId = existingUser.rows[0].id;
                log(`User ${d.first} already exists (ID: ${userId})`);
            }

            // Check if vehicle exists
            const existingVehicle = await client.query(`SELECT id FROM vehicles WHERE license_plate = $1`, [d.plate]);

            let vehicleId;
            if (existingVehicle.rows.length === 0) {
                // Create Vehicle
                const vehicleRes = await client.query(`
          INSERT INTO vehicles (tenant_id, license_plate, make, model, year, vehicle_type, status)
          VALUES ($1, $2, 'Mercedes', 'E-Class', 2023, $3, 'active')
          RETURNING id
        `, [tenantId, d.plate, d.type]);
                vehicleId = vehicleRes.rows[0].id;
                log(`Created vehicle ${d.plate} (ID: ${vehicleId})`);

                // Vehicle Capabilities
                await client.query(`
          INSERT INTO vehicle_capabilities (vehicle_id, luggage_capacity, passenger_capacity, has_airport_permit)
          VALUES ($1, 4, 4, true)
        `, [vehicleId]);
            } else {
                vehicleId = existingVehicle.rows[0].id;
                log(`Vehicle ${d.plate} already exists (ID: ${vehicleId})`);
            }

            // Check if driver profile exists
            const existingDriver = await client.query(`SELECT id FROM drivers WHERE user_id = $1`, [userId]);

            if (existingDriver.rows.length === 0) {
                // Create Driver Profile
                const driverRes = await client.query(`
          INSERT INTO drivers (user_id, vehicle_id, license_number, availability, current_lat, current_lng, location_updated_at)
          VALUES ($1, $2, $3, 'available', $4, $5, NOW())
          RETURNING id
        `, [userId, vehicleId, `LIC-${d.plate}`, d.lat, d.lng]);
                log(`Created driver profile for ${d.first} (ID: ${driverRes.rows[0].id})`);
            } else {
                log(`Driver profile for ${d.first} already exists`);
            }
        }

        log('✅ Seeding complete!');
        await client.query('COMMIT');

    } catch (error) {
        await client.query('ROLLBACK');
        log('❌ Seeding failed: ' + error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
