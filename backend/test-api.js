const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testApi() {
    try {
        console.log('🧪 Testing API Authentication & Data Fetching...');

        // 1. Login
        console.log('\n1. Logging in as admin@taxi.com...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'admin@taxi.com',
            password: 'admin123'
        });

        const token = loginRes.data.token;
        console.log('   ✅ Login successful!');
        console.log(`   Token received (truncated): ${token.substring(0, 20)}...`);

        // 2. Fetch Bookings
        console.log('\n2. Fetching Bookings...');
        const bookingsRes = await axios.get(`${BASE_URL}/bookings`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (bookingsRes.data.success) {
            const bookings = bookingsRes.data.data;
            console.log(`   ✅ Fetch successful! Received ${bookings.length} bookings.`);

            if (bookings.length > 0) {
                console.log('\n   Latest 3 bookings from API:');
                bookings.slice(0, 3).forEach(b => {
                    console.log(`   - Ref: ${b.booking_reference} | Passenger: ${b.passenger_name} | Source: ${b.source} | Status: ${b.status}`);
                });
            } else {
                console.log('   ⚠️ API returned 0 bookings. Checks:');
                console.log('   - Is the query correct?');
                console.log('   - Does the user match the tenant?');
            }
        } else {
            console.log('   ❌ API returned success: false');
            console.log(bookingsRes.data);
        }

    } catch (err) {
        console.error('\n❌ API TEST FAILED');
        if (err.response) {
            console.error(`   Status: ${err.response.status}`);
            console.error(`   Data:`, err.response.data);
        } else {
            console.error(`   Error: ${err.message}`);
        }
    }
}

testApi();
