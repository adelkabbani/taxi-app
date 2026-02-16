const { Client } = require('pg');

async function check() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'adel',
        database: 'taxi_dispatch'
    });

    try {
        await client.connect();
        console.log('--- FINAL DB CHECK ---');
        const db = await client.query('SELECT current_database()');
        console.log('Database:', db.rows[0].current_database);

        const users = await client.query('SELECT id, email, role FROM users');
        console.log('Users:', JSON.stringify(users.rows, null, 2));

        const drivers = await client.query('SELECT id, user_id, availability FROM drivers');
        console.log('Drivers:', JSON.stringify(drivers.rows, null, 2));

        await client.end();
    } catch (err) {
        console.error('CRITICAL ERROR:', err.message);
    }
}

check();
