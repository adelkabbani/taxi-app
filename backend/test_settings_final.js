require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');

const token = jwt.sign(
    { id: 6 },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
);

async function test() {
    try {
        console.log('Fetching settings...');
        const getRes = await axios.get('http://localhost:3000/api/tenants/current/settings', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Current Settings:', getRes.data);

        console.log('Updating stop_sell...');
        const patchRes1 = await axios.patch('http://localhost:3000/api/tenants/current/settings',
            { stop_sell: true },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('Stop Sell Update Result:', patchRes1.data);

        console.log('Updating min_fare...');
        const patchRes2 = await axios.patch('http://localhost:3000/api/tenants/current/settings',
            { autoAssignMinFare: 65 },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('Min Fare Update Result:', patchRes2.data);

    } catch (err) {
        console.error('Test Failed:', err.response ? err.response.data : err.message);
    }
}
test();
