const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function resetHans() {
    console.log('🔄 Resetting password for hans.mueller@taxi.com...');

    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'taxi_dispatch'
    });

    try {
        await client.connect();

        // 1. Generate Hash for 'driver123'
        const newHash = await bcrypt.hash('driver123', 10);

        // 2. Update User
        const email = 'hans.mueller@taxi.com';
        const res = await client.query(
            "UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id",
            [newHash, email]
        );

        if (res.rowCount === 0) {
            console.log(`❌ User ${email} not found!`);
            // Optional: Create if missing? No, user saw it in the screenshot.
        } else {
            console.log(`✅ Password updated for ${email}`);
            console.log(`🔑 New Password: driver123`);
        }

        await client.end();
    } catch (err) {
        console.error('❌ Error:', err);
    }
}

resetHans();
