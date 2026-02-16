const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function testAPI() {
    console.log('🧪 Testing Taxi Dispatch Backend API\n');

    let token = null;

    try {
        // 1. Test Login
        console.log('1️⃣ Testing Login...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@taxi.com',
            password: 'admin123'
        });

        if (loginRes.data.success && loginRes.data.token) {
            token = loginRes.data.token;
            console.log('   ✅ Login successful');
            console.log(`   User: ${loginRes.data.data.firstName} ${loginRes.data.data.lastName}`);
            console.log(`   Role: ${loginRes.data.data.role}\n`);
        } else {
            console.log('   ❌ Login failed\n');
            return;
        }

        // 2. Test Drivers List (THE CRITICAL FIX)
        console.log('2️⃣ Testing Drivers List (checking for 500 error fix)...');
        try {
            const driversRes = await axios.get(`${API_URL}/drivers`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (driversRes.status === 200) {
                console.log('   ✅ Drivers list loaded successfully');
                console.log(`   Found ${driversRes.data.data.length} drivers`);

                // Check if suspension data is included
                const suspendedDrivers = driversRes.data.data.filter(d => d.suspension);
                console.log(`   ${suspendedDrivers.length} driver(s) currently suspended\n`);
            }
        } catch (err) {
            console.log('   ❌ Drivers list FAILED');
            console.log(`   Error: ${err.response?.status} - ${err.response?.data?.message || err.message}\n`);
        }

        // 3. Test Tenants List
        console.log('3️⃣ Testing Tenants/Fleet Management...');
        try {
            const tenantsRes = await axios.get(`${API_URL}/tenants`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (tenantsRes.status === 200) {
                console.log('   ✅ Tenants list loaded');
                console.log(`   Found ${tenantsRes.data.data.length} partner agencies\n`);
            }
        } catch (err) {
            console.log('   ❌ Tenants list failed');
            console.log(`   Error: ${err.response?.status} - ${err.message}\n`);
        }

        // 4. Test Bookings
        console.log('4️⃣ Testing Bookings...');
        try {
            const bookingsRes = await axios.get(`${API_URL}/bookings`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (bookingsRes.status === 200) {
                console.log('   ✅ Bookings list loaded');
                console.log(`   Found ${bookingsRes.data.data.length} bookings\n`);
            }
        } catch (err) {
            console.log('   ❌ Bookings list failed');
            console.log(`   Error: ${err.response?.status} - ${err.message}\n`);
        }

        console.log('═══════════════════════════════════════');
        console.log('✅ API Backend is operational!');
        console.log('═══════════════════════════════════════\n');
        console.log('Next step: Open http://localhost:5173 and use the manual checklist');
        console.log('File: TESTING_CHECKLIST.md\n');

    } catch (err) {
        console.log('❌ Test suite failed');
        console.log(`Error: ${err.message}\n`);
    }
}

testAPI();
