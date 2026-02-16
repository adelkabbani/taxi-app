const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function check() {
    try {
        const userRes = await pool.query("SELECT id, tenant_id FROM users WHERE email = 'admin@taxi.com'");
        if (userRes.rows.length === 0) {
            fs.writeFileSync('status.txt', 'Error: Admin not found');
            return;
        }
        const admin = userRes.rows[0];

        const countRes = await pool.query("SELECT count(*) FROM bookings WHERE tenant_id = $1", [admin.tenant_id]);
        const count = countRes.rows[0].count;

        const bookingsRes = await pool.query("SELECT booking_reference, source FROM bookings WHERE tenant_id = $1 LIMIT 3", [admin.tenant_id]);
        const details = bookingsRes.rows.map(b => `${b.booking_reference} (${b.source})`).join(', ');

        const output = `Admin Tenant: ${admin.tenant_id}\nVisible Bookings: ${count}\nExamples: ${details}`;
        fs.writeFileSync('status.txt', output);

    } catch (err) {
        fs.writeFileSync('status.txt', 'Error: ' + err.message);
    } finally {
        await pool.end();
    }
}
check();
