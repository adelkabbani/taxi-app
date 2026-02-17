const path = require('path');
const fs = require('fs');

console.log('--- Debugging Migration Environment ---');

try {
    const envPath = path.join(__dirname, '../backend/.env');
    console.log('Checking .env at:', envPath);
    if (fs.existsSync(envPath)) {
        console.log('.env FOUND');
        require('dotenv').config({ path: envPath });
    } else {
        console.error('.env NOT FOUND');
    }

    console.log('DB Config:', {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    const db = require('./config/database');
    console.log('Database module loaded.');

    (async () => {
        try {
            console.log('Attempting connection...');
            const res = await db.query('SELECT NOW()');
            console.log('Connection SUCCESS:', res.rows[0]);
            process.exit(0);
        } catch (err) {
            console.error('Connection FAILED:', err);
            process.exit(1);
        }
    })();

} catch (err) {
    console.error('Runtime Error:', err);
    process.exit(1);
}
