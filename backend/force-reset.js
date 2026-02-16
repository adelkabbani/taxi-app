const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function resetAdmin() {
    console.log('🔄 Resetting Admin Credentials...');

    try {
        const client = await pool.connect();
        try {
            // 1. Generate Hash for 'admin123'
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);
            console.log('🔑 Generated new password hash.');

            // 2. Check if user exists
            const check = await client.query("SELECT id FROM users WHERE email = 'admin@taxi.com'");

            if (check.rows.length > 0) {
                // UPDATE
                await client.query(
                    "UPDATE users SET password_hash = $1, status = 'active', role = 'admin' WHERE email = 'admin@taxi.com'",
                    [hashedPassword]
                );
                console.log('✅ UPDATED existing admin user password to: admin123');
            } else {
                // INSERT
                await client.query(
                    `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, status, tenant_id)
                     VALUES ($1, $2, 'admin', 'System', 'Admin', '+1234567890', 'active', 1)`,
                    [hashedPassword, 'admin@taxi.com']
                );
                console.log('✅ CREATED new admin user with password: admin123');
            }

        } finally {
            client.release();
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

resetAdmin();
