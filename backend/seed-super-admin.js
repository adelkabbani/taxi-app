/**
 * seed-super-admin.js
 * -------------------
 * The Golden Record Admin Seeder.
 * Wipes ALL duplicate or broken admin@taxi.com accounts and injects exactly
 * ONE super-admin with a freshly generated bcrypt password hash.
 *
 * Usage:  node seed-super-admin.js
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const ADMIN_EMAIL = 'admin@taxi.com';
const ADMIN_PASSWORD = 'Admin@Taxio123!'; // Change after first login

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function seedAdmin() {
    const client = await pool.connect();
    try {
        console.log('🚀 SUPER-ADMIN SEEDER STARTING...\n');
        await client.query('BEGIN');

        // 1. Identify the canonical tenant (the one that owns the most bookings)
        const tenantRes = await client.query(`
            SELECT t.id, t.name, COUNT(b.id) AS booking_count
            FROM tenants t
            LEFT JOIN bookings b ON b.tenant_id = t.id
            GROUP BY t.id, t.name
            ORDER BY booking_count DESC
            LIMIT 1
        `);
        const tenant = tenantRes.rows[0];
        if (!tenant) throw new Error('No tenants found — create at least one tenant first.');
        console.log(`✓ Canonical tenant: [${tenant.id}] ${tenant.name} (${tenant.booking_count} bookings)`);

        // 2. Generate a fresh bcrypt hash
        const salt = await bcrypt.genSalt(12);
        const hash = await bcrypt.hash(ADMIN_PASSWORD, salt);
        console.log('✓ Fresh bcrypt hash generated (rounds: 12)');

        // 3. Find existing admin (we cannot delete due to FK constraints on bookings)
        const existing = await client.query(
            `SELECT id FROM users WHERE email = $1 LIMIT 1`,
            [ADMIN_EMAIL]
        );

        let admin;
        if (existing.rowCount > 0) {
            // UPDATE in-place to preserve FK references
            console.log(`🔄 Existing admin found (ID: ${existing.rows[0].id}) — updating password & status...`);
            const updated = await client.query(`
                UPDATE users
                SET password_hash = $1,
                    role          = 'admin',
                    status        = 'active',
                    is_active     = true,
                    tenant_id     = $2,
                    updated_at    = NOW()
                WHERE email = $3
                RETURNING id, email, role, tenant_id
            `, [hash, tenant.id, ADMIN_EMAIL]);
            admin = updated.rows[0];
        } else {
            // Fresh insert — no existing user to worry about
            console.log('  No existing admin found — inserting fresh account...');
            const inserted = await client.query(`
                INSERT INTO users
                    (email, password_hash, role, status, is_active, tenant_id, first_name, last_name, created_at, updated_at)
                VALUES
                    ($1, $2, 'admin', 'active', true, $3, 'Super', 'Admin', NOW(), NOW())
                RETURNING id, email, role, tenant_id
            `, [ADMIN_EMAIL, hash, tenant.id]);
            admin = inserted.rows[0];
        }
        console.log('\n✅ Super-Admin created successfully!');
        console.log('─────────────────────────────────────');
        console.log(`   ID:        ${admin.id}`);
        console.log(`   Email:     ${admin.email}`);
        console.log(`   Role:      ${admin.role}`);
        console.log(`   Tenant ID: ${admin.tenant_id}`);
        console.log(`   Password:  ${ADMIN_PASSWORD}`);
        console.log('─────────────────────────────────────');
        console.log('⚠️  Change the password after your first login!\n');

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\n❌ SEEDER FAILED:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

seedAdmin();
