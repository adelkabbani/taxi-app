// Simple test to see if server.js has syntax errors
try {
    console.log('Testing server.js...');
    require('./server.js');
} catch (error) {
    console.error('ERROR:', error.message);
    console.error('Stack:', error.stack);
}
