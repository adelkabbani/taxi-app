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

async function resetUser(email, plainPassword) {
    console.log(`🔄 Resetting Credentials for ${email}...`);
    try {
        const client = await pool.connect();
        try {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(plainPassword, salt);
            const check = await client.query("SELECT id FROM users WHERE email = $1", [email]);
            if (check.rows.length > 0) {
                await client.query(
                    "UPDATE users SET password_hash = $1, status = 'active' WHERE email = $2",
                    [hashedPassword, email]
                );
                console.log(`✅ UPDATED ${email} password to: ${plainPassword}`);
            } else {
                console.log(`❌ User ${email} not found.`);
            }
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

async function runReset() {
    await resetAdmin();
    await resetUser('hans.driver@taxi.com', 'Adel1234567890');
    await pool.end();
}

runReset();
