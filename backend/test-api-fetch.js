const BASE_URL = 'http://localhost:3001/api';

async function test() {
    console.log('🧪 DIAGNOSTIC (FETCH)');

    try {
        // 1. Health
        console.log('1. GET /health');
        const healthRes = await fetch('http://localhost:3001/api/health/status');
        console.log(`   Status: ${healthRes.status}`);

        // 2. Login
        console.log('\n2. POST /auth/login');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@taxi.com', password: 'admin123' })
        });

        const loginData = await loginRes.json();
        if (!loginRes.ok) {
            console.log('   ❌ Login Failed:', JSON.stringify(loginData));
            return;
        }
        console.log('   ✅ Login OK');
        const token = loginData.token;

        // 3. GET /bookings
        console.log('\n3. GET /bookings');
        const bookingsRes = await fetch(`${BASE_URL}/bookings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log(`   Status: ${bookingsRes.status}`);
        const text = await bookingsRes.text();
        try {
            const data = JSON.parse(text);
            console.log('   Data count:', data.data ? data.data.length : 'No data field');
        } catch (e) {
            console.log('   ❌ Response is not JSON:', text.substring(0, 100));
        }

    } catch (err) {
        console.log('❌ NETWORK ERROR:', err.message);
        if (err.cause) console.log('   Cause:', err.cause);
    }
}

test();
