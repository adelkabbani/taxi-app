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

async function testLoginFlow() {
    try {
        console.log('🔄 Testing Login Flow for driver_auto@taxi.com...');

        // 1. Fetch User
        const res = await pool.query("SELECT * FROM users WHERE email = 'driver_auto@taxi.com'");
        if (res.rows.length === 0) {
            console.log('❌ User not found');
            return;
        }
        const user = res.rows[0];
        console.log('👤 User Found:', user.email);

        // 2. Test Password
        const inputPass = 'driver123';
        console.log(`🔑 Testing password: '${inputPass}'`);
        const isMatch = await bcrypt.compare(inputPass, user.password_hash);

        if (isMatch) {
            console.log('✅ Password VALID');
        } else {
            console.log('❌ Password INVALID');
            console.log('   Hash in DB:', user.password_hash);

            // Re-hash
            const newHash = await bcrypt.hash(inputPass, 10);
            await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, user.id]);
            console.log('🛠️  Fixed password hash in DB.');
        }

        // 3. Test Driver Association (Critical for Driver App)
        const driverRes = await pool.query("SELECT * FROM drivers WHERE user_id = $1", [user.id]);
        if (driverRes.rows.length === 0) {
            console.log('❌ Driver Profile NOT found for this user!');
        } else {
            console.log('✅ Driver Profile found (ID: ' + driverRes.rows[0].id + ')');
        }

    } catch (err) {
        console.error('💥 Error:', err);
    } finally {
        await pool.end();
    }
}

testLoginFlow();
