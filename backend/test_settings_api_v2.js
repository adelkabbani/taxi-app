require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const token = jwt.sign(
    { id: 6 },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
);

async function test() {
    let report = '';
    try {
        report += 'Fetching settings...\n';
        const getRes = await axios.get('http://localhost:3000/api/tenants/current/settings', {
            headers: { Authorization: `Bearer ${token}` }
        });
        report += 'Current Settings: ' + JSON.stringify(getRes.data) + '\n';

        report += 'Updating stop_sell...\n';
        const patchRes1 = await axios.patch('http://localhost:3000/api/tenants/current/settings',
            { stop_sell: true },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        report += 'Stop Sell Update Result: ' + JSON.stringify(patchRes1.data) + '\n';

    } catch (err) {
        report += 'Test Failed: ' + (err.response ? JSON.stringify(err.response.data) : err.message) + '\n';
    }
    fs.writeFileSync('api_report.txt', report);
    process.exit();
}
test();
