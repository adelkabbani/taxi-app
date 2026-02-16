const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function ensureAdmin() {
    const client = await pool.connect();
    try {
        console.log('🛡️ Ensuring admin user exists...');

        // 1. Ensure Tenant
        let tenantId;
        const tenantRes = await client.query("SELECT id FROM tenants WHERE slug = 'berlin-taxi'");
        if (tenantRes.rows.length > 0) {
            tenantId = tenantRes.rows[0].id;
        } else {
            const newTenant = await client.query(`
        INSERT INTO tenants (name, slug, settings)
        VALUES ('Berlin Taxi Co', 'berlin-taxi', '{"currency": "EUR"}')
        RETURNING id
      `);
            tenantId = newTenant.rows[0].id;
        }

        // 2. Ensure Admin
        const adminRes = await client.query("SELECT id FROM users WHERE email = 'admin@taxi.com'");
        if (adminRes.rows.length === 0) {
            const hash = await bcrypt.hash('admin123', 10);
            await client.query(`
        INSERT INTO users (tenant_id, email, phone, password_hash, first_name, last_name, role, status)
        VALUES ($1, 'admin@taxi.com', '+49000000000', $2, 'System', 'Admin', 'admin', 'active')
      `, [tenantId, hash]);
            console.log('✅ Admin user created: admin@taxi.com / admin123');
        } else {
            console.log('ℹ️ Admin user already exists.');
        }
    } catch (err) {
        console.error('❌ Failed to ensure admin:', err);
    } finally {
        client.release();
        pool.end();
    }
}

ensureAdmin();
