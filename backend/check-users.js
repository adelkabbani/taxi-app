const { Client } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'taxi_dispatch'
};

async function checkUsers() {
    const client = new Client(config);
    try {
        await client.connect();
        const res = await client.query('SELECT id, email, phone, role, status FROM users');
        console.log('User Records:', res.rows);
        fs.writeFileSync('users-dump.json', JSON.stringify(res.rows, null, 2));
        await client.end();
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkUsers();
