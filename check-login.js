const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function checkLogin() {
    try {
        console.log('Checking admin user in database...\n');

        const result = await pool.query(
            `SELECT id, email, role, first_name, last_name, password_hash 
             FROM users 
             WHERE email = 'admin@taxi.com'`
        );

        if (result.rows.length === 0) {
            console.log('❌ No user found with email: admin@taxi.com');
            console.log('\nLet me check all admin users:');
            const allAdmins = await pool.query(
                `SELECT id, email, role, first_name, last_name 
                 FROM users 
                 WHERE role = 'admin'`
            );
            console.log('Admin users:', allAdmins.rows);
        } else {
            console.log('✅ User found:');
            console.log('   ID:', result.rows[0].id);
            console.log('   Email:', result.rows[0].email);
            console.log('   Role:', result.rows[0].role);
            console.log('   Name:', result.rows[0].first_name, result.rows[0].last_name);
            console.log('   Password Hash:', result.rows[0].password_hash ? 'EXISTS' : 'MISSING');

            // Test password
            const bcrypt = require('bcrypt');
            const isValid = await bcrypt.compare('admin123', result.rows[0].password_hash);
            console.log('\n   Password "admin123" valid?', isValid ? '✅ YES' : '❌ NO');

            if (!isValid) {
                console.log('\n⚠️  Password does not match. Creating new hash...');
                const newHash = await bcrypt.hash('admin123', 10);
                await pool.query(
                    'UPDATE users SET password_hash = $1 WHERE email = $2',
                    [newHash, 'admin@taxi.com']
                );
                console.log('✅ Password updated! Try logging in again with: admin123');
            }
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkLogin();
