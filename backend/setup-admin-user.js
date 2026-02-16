const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'taxi_dispatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
});

async function checkAndCreateAdmin() {
    try {
        console.log('🔍 Checking existing users...\n');

        // Check all users
        const usersResult = await pool.query('SELECT id, email, first_name, last_name, role, is_active FROM users');

        if (usersResult.rows.length === 0) {
            console.log('❌ No users found in database!\n');
        } else {
            console.log('✅ Existing users:');
            usersResult.rows.forEach(user => {
                console.log(`   ID: ${user.id} | Email: ${user.email} | Role: ${user.role} | Active: ${user.is_active}`);
            });
            console.log('');
        }

        // Check for admin@fleet.com
        const adminResult = await pool.query("SELECT * FROM users WHERE email = 'admin@fleet.com'");

        if (adminResult.rows.length > 0) {
            console.log('⚠️  admin@fleet.com already exists!');
            console.log('   Updating password to "admin123"...\n');

            const hashedPassword = await bcrypt.hash('admin123', 10);
            await pool.query(
                "UPDATE users SET password = $1, is_active = true WHERE email = 'admin@fleet.com'",
                [hashedPassword]
            );

            console.log('✅ Password updated successfully!');
        } else {
            console.log('📝 Creating admin@fleet.com user...\n');

            // Ensure tenant exists
            let tenantResult = await pool.query("SELECT id FROM tenants WHERE slug = 'default'");
            let tenantId;

            if (tenantResult.rows.length === 0) {
                const newTenant = await pool.query(
                    "INSERT INTO tenants (name, slug, is_active) VALUES ('Default Fleet', 'default', true) RETURNING id"
                );
                tenantId = newTenant.rows[0].id;
                console.log(`✅ Created tenant with ID: ${tenantId}`);
            } else {
                tenantId = tenantResult.rows[0].id;
                console.log(`✅ Using existing tenant ID: ${tenantId}`);
            }

            // Create admin user
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const result = await pool.query(
                `INSERT INTO users (tenant_id, email, password, first_name, last_name, phone, role, is_active)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING id, email, first_name, last_name, role`,
                [tenantId, 'admin@fleet.com', hashedPassword, 'Admin', 'User', '+1234567890', 'admin', true]
            );

            console.log('\n✅ Admin user created successfully!');
            console.log(`   ID: ${result.rows[0].id}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('🎉 SUCCESS! Login credentials:');
        console.log('='.repeat(60));
        console.log('   Email: admin@fleet.com');
        console.log('   Password: admin123');
        console.log('='.repeat(60) + '\n');

        await pool.end();

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    }
}

checkAndCreateAdmin();
