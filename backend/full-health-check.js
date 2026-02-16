const fs = require('fs');
const BASE_URL = 'http://localhost:3002/api';
let TOKEN = '';
let REPORT = 'SYSTEM HEALTH REPORT\n--------------------\n';

function log(msg) {
    console.log(msg);
    REPORT += msg + '\n';
}

async function runHealthCheck() {
    log('🏥 STARTING SYSTEM HEALTH CHECK...\n');

    // 1. LOGIN
    try {
        log('1️⃣  Testing Login...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@taxi.com',
                password: 'admin123'
            })
        });

        const loginData = await loginRes.json();

        if (!loginRes.ok) throw new Error(loginData.message || 'Login failed');

        TOKEN = loginData.data.token;
        log('   ✅ Login Successful');
    } catch (e) {
        log('   ❌ Login FAILED: ' + e.message);
        fs.writeFileSync('health-report.txt', REPORT);
        return;
    }

    const headers = {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
    };

    // 2. CHECK DASHBOARD STATS
    try {
        log('\n2️⃣  Testing Dashboard Stats...');
        const statsRes = await fetch(`${BASE_URL}/stats/dashboard`, { headers });
        if (statsRes.ok) {
            log('   ✅ Stats Loaded: OK');
        } else {
            log('   ⚠️  Stats Check Warning: Status ' + statsRes.status);
        }
    } catch (e) {
        log('   ⚠️  Stats Check Error: ' + e.message);
    }

    // 3. CHECK BOOKINGS
    try {
        log('\n3️⃣  Testing Bookings List...');
        const bookingsRes = await fetch(`${BASE_URL}/bookings`, { headers });
        if (bookingsRes.ok) {
            const data = await bookingsRes.json();
            const count = data.results || (data.data && data.data.length) || 0;
            log(`   ✅ Bookings Loaded: Found ${count} bookings`);
        } else {
            log('   ❌ Bookings Check FAILED: Status ' + bookingsRes.status);
        }
    } catch (e) {
        log('   ❌ Bookings Check Error: ' + e.message);
    }

    // 4. CHECK DRIVERS
    try {
        log('\n4️⃣  Testing Drivers List...');
        const driversRes = await fetch(`${BASE_URL}/drivers`, { headers });
        if (driversRes.ok) {
            const data = await driversRes.json();
            const drivers = data.data || [];
            log(`   ✅ Drivers Loaded: Found ${drivers.length} drivers`);
        } else {
            log('   ❌ Drivers Check FAILED: Status ' + driversRes.status);
        }
    } catch (e) {
        log('   ❌ Drivers Check Error: ' + e.message);
    }

    log('\n🏁 HEALTH CHECK COMPLETE');
    fs.writeFileSync('health-report.txt', REPORT);
}

runHealthCheck();
