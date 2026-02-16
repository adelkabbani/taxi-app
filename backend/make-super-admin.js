const { Pool } = require('pg');
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'taxi_dispatch',
    user: 'postgres',
    password: 'adel'
});

async function makeSuperAdmin() {
    const client = await pool.connect();
    try {
        await client.query("UPDATE users SET tenant_id = NULL WHERE email = 'admin@taxi.com'");
        console.log("✅ Successfully updated admin@taxi.com to be Super Admin (tenant_id = NULL)");
    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

makeSuperAdmin();
