const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/drivers',
    method: 'GET',
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        require('fs').writeFileSync('api-result.json', data);
        console.log('Status:', res.statusCode);
    });
});

req.on('error', (e) => {
    require('fs').writeFileSync('api-result.json', JSON.stringify({ error: e.message }));
    console.error(`Problem with request: ${e.message}`);
});

req.end();
