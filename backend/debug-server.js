try {
    console.log('Attempting to require server.js...');
    require('./server.js');
    console.log('server.js required successfully.');
} catch (err) {
    console.error('CRITICAL ERROR:', err);
}
