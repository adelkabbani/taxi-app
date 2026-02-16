
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const API_URL = 'http://localhost:3001/api';

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function simulate() {
    console.log('🚀 Starting Booking Simulation...');

    // 1. Ensure Admin User
    const client = await pool.connect();
    let adminToken = '';

    try {
        console.log('👤 Ensuring Sim Admin exists...');
        const email = 'sim_admin@taxi.com';
        const password = 'password123';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Get Tenant
        const tenantRes = await client.query("SELECT id FROM tenants LIMIT 1");
        const tenantId = tenantRes.rows[0]?.id || 1;

        // Upsert Admin
        await client.query(`
            INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, phone)
            VALUES ($1, $2, $3, 'Sim', 'Admin', 'admin', '+0000000000')
            ON CONFLICT (tenant_id, email) 
            DO UPDATE SET role = 'admin'
        `, [tenantId, email, hashedPassword]);

        // 2. Login
        console.log('🔑 Logging in as Admin...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const loginData = await loginRes.json();
        if (!loginData.success) throw new Error('Login failed: ' + loginData.message);
        adminToken = loginData.data.token;
        console.log('✅ Logged in!');

        // 3. Find Available Driver
        console.log('🔍 Finding available driver...');
        const driversRes = await fetch(`${API_URL}/drivers?availability=available`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const driversData = await driversRes.json();

        if (!driversData.data || driversData.data.length === 0) {
            throw new Error('No available drivers found! Make sure your driver app is Online.');
        }

        const driver = driversData.data[0];
        console.log(`✅ Found Driver: ${driver.first_name} ${driver.last_name} (ID: ${driver.id})`);

        // 4. Create Booking
        console.log('📝 Creating Booking...');
        const bookingPayload = {
            passengerName: "Alice Wonderland",
            passengerPhone: "+49123456789",
            pickupAddress: "Alexanderplatz, Berlin",
            pickupLat: 52.5219,
            pickupLng: 13.4132,
            dropoffAddress: "Brandenburg Gate, Berlin",
            dropoffLat: 52.5163,
            dropoffLng: 13.3777,
            scheduledPickupTime: new Date(Date.now() + 15 * 60000).toISOString(), // 15 mins from now
            fareEstimate: 25.50
        };

        const createRes = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify(bookingPayload)
        });
        const createData = await createRes.json();
        if (!createData.success) throw new Error('Create booking failed');
        const bookingId = createData.data.id;
        console.log(`✅ Booking Created! ID: ${bookingId} (${createData.data.booking_reference})`);

        // 5. Assign Driver
        console.log(`🚕 Assigning Driver ${driver.id} to Booking ${bookingId}...`);
        const assignRes = await fetch(`${API_URL}/bookings/${bookingId}/assign`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ driverId: driver.id })
        });
        const assignData = await assignRes.json();

        if (assignData.success) {
            console.log('🎉 SUCCESS! Driver assigned. Check your Driver App!');
        } else {
            console.error('❌ Assignment failed:', assignData);
        }

    } catch (err) {
        console.error('❌ Simulation Error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

simulate();
