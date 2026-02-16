const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'taxi_dispatch',
    user: 'postgres',
    password: 'adel'
});

async function debugLogin() {
    try {
        console.log('🔍 DEBUG LOGIN START');

        // 1. Get User
        const res = await pool.query("SELECT * FROM users WHERE email = 'driver_auto@taxi.com'");
        if (res.rows.length === 0) {
            console.log('❌ User not found');
            return;
        }

        const user = res.rows[0];
        console.log('✅ User Found:', {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status,
            tenant_id: user.tenant_id
        });

        // 2. Check Password
        const inputPass = 'driver123';
        const isMatch = await bcrypt.compare(inputPass, user.password_hash);
        console.log(`🔐 Password Match ('${inputPass}'):`, isMatch);

        if (!isMatch) {
            console.log('⚠️  Password Hash in DB:', user.password_hash);

            // Fix it
            const newHash = await bcrypt.hash(inputPass, 10);
            await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, user.id]);
            console.log('✅ Password hash UPDATED to match driver123');
        }

        // 3. Check Driver Profile
        const driverRes = await pool.query("SELECT * FROM drivers WHERE user_id = $1", [user.id]);
        if (driverRes.rows.length === 0) {
            console.log('❌ Driver Profile missing');
        } else {
            console.log('✅ Driver Profile Found:', driverRes.rows[0]);
        }

    } catch (e) {
        console.error('❌ ERROR:', e);
    } finally {
        await pool.end();
    }
}

debugLogin();
