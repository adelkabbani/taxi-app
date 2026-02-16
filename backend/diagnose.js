console.log('=== BACKEND DIAGNOSTIC ===\n');

// Test 1: Can we load dotenv?
console.log('1. Loading dotenv...');
try {
    require('dotenv').config();
    console.log('   ✅ dotenv loaded');
} catch (e) {
    console.log('   ❌ dotenv failed:', e.message);
    process.exit(1);
}

// Test 2: Can we connect to database?
console.log('\n2. Testing database connection...');
try {
    const { Pool } = require('pg');
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'taxi_dispatch',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD
    });

    pool.query('SELECT 1')
        .then(() => {
            console.log('   ✅ Database connected');
            return pool.end();
        })
        .then(() => {
            // Test 3: Can we load server.js?
            console.log('\n3. Loading server.js...');
            try {
                require('./server.js');
                console.log('   ✅ Server loaded successfully');
            } catch (e) {
                console.log('   ❌ Server failed to load:');
                console.log('   Error:', e.message);
                console.log('   Stack:', e.stack);
            }
        })
        .catch(e => {
            console.log('   ❌ Database failed:', e.message);
            console.log('\n   Check your .env file:');
            console.log('   DB_HOST:', process.env.DB_HOST);
            console.log('   DB_PORT:', process.env.DB_PORT);
            console.log('   DB_NAME:', process.env.DB_NAME);
            console.log('   DB_USER:', process.env.DB_USER);
            console.log('   DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');
        });

} catch (e) {
    console.log('   ❌ Failed:', e.message);
}
