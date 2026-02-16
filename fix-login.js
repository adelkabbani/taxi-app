require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'taxi_dispatch',
    user: 'postgres',
    password: 'adel'
});

async function fixLogin() {
    try {
        // Check if user exists
        const check = await pool.query(
            "SELECT * FROM users WHERE email = 'admin@taxi.com'"
        );

        if (check.rows.length === 0) {
            console.log('No admin user found. Creating one...');
            const hash = await bcrypt.hash('admin123', 10);
            await pool.query(
                `INSERT INTO users (tenant_id, role, email, phone, password_hash, first_name, last_name)
                 VALUES (1, 'admin', 'admin@taxi.com', '+491234567890', $1, 'Admin', 'User')`,
                [hash]
            );
            console.log('✅ Admin user created!');
        } else {
            console.log('User exists. Updating password...');
            const hash = await bcrypt.hash('admin123', 10);
            await pool.query(
                "UPDATE users SET password_hash = $1 WHERE email = 'admin@taxi.com'",
                [hash]
            );
            console.log('✅ Password updated!');
        }

        console.log('\nYou can now login with:');
        console.log('Email: admin@taxi.com');
        console.log('Password: admin123');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

fixLogin();
