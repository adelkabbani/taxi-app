const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Simple test server is working!\n');
});

server.listen(3001, '0.0.0.0', () => {
    console.log('✅ Test server running on http://localhost:3001');
    console.log('If you can see this, Node.js and port 3001 are working fine.');
    console.log('Press Ctrl+C to stop.');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log('❌ Port 3001 is already in use!');
        console.log('Another process is using this port.');
        console.log('Try closing other Node.js processes or use a different port.');
    } else {
        console.log('❌ Server error:', err.message);
    }
});
