require('dotenv').config();
const axios = require('axios');

async function test() {
    try {
        // 1. Login
        console.log('Logging in as admin@taxi.com...');
        const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'admin@taxi.com',
            password: 'password123' // assuming this is the password
        });

        const token = loginRes.data.token;
        console.log('Token acquired.');

        // 2. Fetch current settings
        console.log('Fetching settings...');
        const getRes = await axios.get('http://localhost:3000/api/tenants/current/settings', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Current Settings:', getRes.data);

        // 3. Try Update
        console.log('Updating settings...');
        const patchRes = await axios.patch('http://localhost:3000/api/tenants/current/settings',
            { stop_sell: true, autoAssignMinFare: 60 },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('Update Result:', patchRes.data);

    } catch (err) {
        console.error('Test Failed:', err.response ? err.response.data : err.message);
    }
}
test();
