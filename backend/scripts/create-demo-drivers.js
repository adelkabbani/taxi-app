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

async function createDemoDrivers() {
    const client = await pool.connect();
    try {
        console.log('🌱 Creating 5 Fake Demo Drivers...');
        const tenantIdRes = await client.query("SELECT id FROM tenants LIMIT 1");
        const tenantId = tenantIdRes.rows[0].id;
        const password = await bcrypt.hash('123456', 10);

        const drivers = [
            { first: 'Liam', last: 'O\'Connor', phone: '+15550101', plate: 'DEMO-01', type: 'sedan' },
            { first: 'Emma', last: 'Wilson', phone: '+15550102', plate: 'DEMO-02', type: 'van' },
            { first: 'Noah', last: 'Patel', phone: '+15550103', plate: 'DEMO-03', type: 'luxury' },
            { first: 'Olivia', last: 'Schmidt', phone: '+15550104', plate: 'DEMO-04', type: 'sedan' },
            { first: 'William', last: 'Dubois', phone: '+15550105', plate: 'DEMO-05', type: 'sedan' }
        ];

        for (const d of drivers) {
            // 1. Create User
            const email = `${d.first.toLowerCase()}.demo@taxi.com`;
            const userRes = await client.query(`
                INSERT INTO users (tenant_id, email, phone, password_hash, first_name, last_name, role, status)
                VALUES ($1, $2, $3, $4, $5, $6, 'driver', 'active')
                ON CONFLICT (tenant_id, email) DO UPDATE SET first_name = EXCLUDED.first_name
                RETURNING id
            `, [tenantId, email, d.phone, password, d.first, d.last]);
            const userId = userRes.rows[0].id;

            // 2. Create Vehicle
            const vehicleRes = await client.query(`
                INSERT INTO vehicles (tenant_id, license_plate, make, model, year, vehicle_type, status)
                VALUES ($1, $2, 'Toyota', 'Camry', 2024, $3, 'active')
                ON CONFLICT (tenant_id, license_plate) DO UPDATE SET status = 'active'
                RETURNING id
            `, [tenantId, d.plate, d.type]);
            const vehicleId = vehicleRes.rows[0].id;

            // 3. Create Driver Profile
            const existingDriver = await client.query('SELECT id FROM drivers WHERE user_id = $1', [userId]);

            if (existingDriver.rows.length === 0) {
                await client.query(`
                    INSERT INTO drivers (user_id, vehicle_id, license_number, availability, current_lat, current_lng)
                    VALUES ($1, $2, $3, 'available', 52.5200, 13.4050)
                `, [userId, vehicleId, `LIC-${d.plate}`]);
            }

            console.log(`✅ Created Driver: ${d.first} ${d.last} (${email})`);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

createDemoDrivers();
