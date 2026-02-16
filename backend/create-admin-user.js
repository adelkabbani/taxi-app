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

async function createAdminUser() {
    const client = await pool.connect();

    try {
        console.log('🚀 Creating admin user...\n');

        // Check if tenant exists
        let tenantResult = await client.query(
            "SELECT id FROM tenants WHERE slug = 'default' LIMIT 1"
        );

        let tenantId;
        if (tenantResult.rows.length === 0) {
            // Create default tenant
            console.log('📋 Creating default tenant...');
            const newTenant = await client.query(
                "INSERT INTO tenants (name, slug, is_active) VALUES ('Default Fleet', 'default', true) RETURNING id"
            );
            tenantId = newTenant.rows[0].id;
            console.log(`✅ Tenant created with ID: ${tenantId}\n`);
        } else {
            tenantId = tenantResult.rows[0].id;
            console.log(`✅ Using existing tenant with ID: ${tenantId}\n`);
        }

        // Check if admin user already exists
        const existingUser = await client.query(
            "SELECT id, email FROM users WHERE email = 'admin@fleet.com'"
        );

        if (existingUser.rows.length > 0) {
            console.log('⚠️  Admin user already exists!');
            console.log('   Email: admin@fleet.com');
            console.log('   User ID:', existingUser.rows[0].id);
            console.log('\n🔑 Updating password to: admin123\n');

            // Update password
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await client.query(
                "UPDATE users SET password = $1, is_active = true WHERE email = 'admin@fleet.com'",
                [hashedPassword]
            );

            console.log('✅ Password updated successfully!');
        } else {
            // Create new admin user
            console.log('👤 Creating new admin user...');

            const hashedPassword = await bcrypt.hash('admin123', 10);

            const userResult = await client.query(
                `INSERT INTO users 
                (tenant_id, email, password, first_name, last_name, role, is_active, phone)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, email, first_name, last_name, role`,
                [tenantId, 'admin@fleet.com', hashedPassword, 'Admin', 'User', 'admin', true, '+1234567890']
            );

            const user = userResult.rows[0];
            console.log('✅ Admin user created successfully!');
            console.log(`   ID: ${user.id}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Name: ${user.first_name} ${user.last_name}`);
            console.log(`   Role: ${user.role}`);
        }

        console.log('\n' + '='.repeat(50));
        console.log('🎉 SUCCESS! You can now login with:');
        console.log('='.repeat(50));
        console.log('   Email: admin@fleet.com');
        console.log('   Password: admin123');
        console.log('='.repeat(50) + '\n');

        await pool.end();

    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
        console.error('\nDetails:', error);
        process.exit(1);
    }
}

createAdminUser();
