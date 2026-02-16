const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testApi() {
    try {
        console.log('🧪 DIAGNOSTIC API TEST');

        // 1. Health Check
        try {
            console.log('1. Checking Health (GET /health)...');
            const health = await axios.get('http://localhost:3001/api/health');
            console.log('   ✅ Health OK:', health.data);
        } catch (e) {
            console.log('   ❌ Health Check Failed:', e.message);
        }

        // 2. Login
        console.log('\n2. Logging in...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'admin@taxi.com',
            password: 'admin123'
        });
        const token = loginRes.data.token;
        console.log('   ✅ Login successful!');

        // 3. Fetch Bookings
        console.log('\n3. Fetching Bookings (GET /bookings)...');
        try {
            const bookingsRes = await axios.get(`${BASE_URL}/bookings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`   ✅ Success! Count: ${bookingsRes.data.data.length}`);
        } catch (err) {
            console.log('   ❌ GET /bookings FAILED!');
            if (err.response) {
                console.log('   Status:', err.response.status);
                console.log('   Data:', JSON.stringify(err.response.data, null, 2));
            } else {
                console.log('   Error:', err.message);
            }
        }

    } catch (err) {
        console.error('\n❌ FATAL ERROR IN SCRIPT:', err.message);
        if (err.response) console.log('   Response:', err.response.data);
    }
}

testApi();
