const { Client } = require('pg');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'taxi_dispatch'
};

async function fixPassword() {
    const client = new Client(config);
    try {
        const hash = await bcrypt.hash('admin123', 10);
        console.log('New Hash:', hash);

        await client.connect();
        const res = await client.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id',
            [hash, 'admin@taxi.com']
        );

        if (res.rowCount > 0) {
            console.log('✅ Admin password updated successfully!');
        } else {
            console.log('❌ Admin user not found!');
        }

        await client.end();
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixPassword();
