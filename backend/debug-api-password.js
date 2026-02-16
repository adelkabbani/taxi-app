const axios = require('axios');
require('dotenv').config();

async function testPasswordUpdate() {
    try {
        console.log('Testing password update API...');

        // 1. Login as admin to get token
        const loginRes = await axios.post('http://localhost:3002/api/auth/login', {
            email: 'admin@taxi.com',
            password: 'admin123'
        });

        const token = loginRes.data.token;
        console.log('Got admin token.');

        // 2. Get a driver ID (e.g., driver_auto)
        // We know driver_auto ID from previous steps or can fetch it
        // Let's just fetch all drivers and pick the first one
        const driversRes = await axios.get('http://localhost:3002/api/drivers', {
            headers: { Authorization: `Bearer ${token}` }
        });

        const driver = driversRes.data.data.find(d => d.email === 'driver_auto@taxi.com') || driversRes.data.data[0];

        if (!driver) {
            console.error('No drivers found to test with.');
            return;
        }

        console.log(`Attempting to update password for driver: ${driver.first_name} (ID: ${driver.id})`);

        // 3. call PATCH /api/drivers/:id/password
        const updateRes = await axios.patch(
            `http://localhost:3002/api/drivers/${driver.id}/password`,
            { password: 'newdriverpass123' },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log('Response:', updateRes.data);

    } catch (e) {
        console.error('API Error:', e.response ? e.response.data : e.message);
        if (e.response && e.response.status === 404) {
            console.error('Is the server running? Is the route registered?');
        }
    }
}

testPasswordUpdate();
