const { Client } = require('pg');
const bcrypt = require('bcrypt');
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

async function testLogin() {
    const result = { found: false, passwordMatch: false, error: null };
    const client = new Client(config);
    try {
        await client.connect();
        const res = await client.query('SELECT * FROM users WHERE email = $1', ['admin@taxi.com']);

        if (res.rows.length > 0) {
            result.found = true;
            const user = res.rows[0];
            // Test bcrypt
            result.passwordMatch = await bcrypt.compare('admin123', user.password_hash);
            result.hashPrefix = user.password_hash.substring(0, 10);
        }

        fs.writeFileSync('login-test.json', JSON.stringify(result, null, 2));
        await client.end();
        process.exit(0);
    } catch (err) {
        fs.writeFileSync('login-test.json', JSON.stringify({ error: err.message }, null, 2));
        process.exit(1);
    }
}

testLogin();
