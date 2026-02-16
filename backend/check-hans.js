const { Client } = require('pg');
require('dotenv').config();

async function checkHans() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'taxi_dispatch'
    });

    try {
        await client.connect();
        console.log('--- HANS DIAGNOSTIC ---');

        // Check User
        const user = await client.query("SELECT * FROM users WHERE email = 'hans.driver@taxi.com'");
        if (user.rows.length === 0) {
            console.log('User Hans NOT FOUND');
        } else {
            console.log('User:', JSON.stringify(user.rows[0], null, 2));
            const userId = user.rows[0].id;

            // Check Driver Profile
            const driver = await client.query("SELECT * FROM drivers WHERE user_id = $1", [userId]);
            if (driver.rows.length === 0) {
                console.log('Driver Profile NOT FOUND for user ID', userId);
            } else {
                console.log('Driver:', JSON.stringify(driver.rows[0], null, 2));
            }
        }

        // Total Counts
        const counts = await client.query("SELECT (SELECT count(*) FROM users) as u, (SELECT count(*) FROM drivers) as d");
        console.log('Total Users:', counts.rows[0].u);
        console.log('Total Drivers:', counts.rows[0].d);

        await client.end();
    } catch (err) {
        console.error('CheckHans Error:', err);
    }
}

checkHans();
