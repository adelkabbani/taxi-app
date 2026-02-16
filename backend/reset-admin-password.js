const { Client } = require('pg');

async function resetPassword() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'taxi_dispatch',
        user: 'postgres',
        password: 'adel'
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // The hash for 'admin123' (you may need to generate a fresh one)
        const passwordHash = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW';

        // Try to update existing user
        const updateResult = await client.query(
            `UPDATE users 
             SET password_hash = $1 
             WHERE email = 'admin@taxi.com'
             RETURNING id, email`,
            [passwordHash]
        );

        if (updateResult.rowCount > 0) {
            console.log('✅ Password updated for:', updateResult.rows[0].email);
        } else {
            console.log('No user found, creating new admin...');
            await client.query(
                `INSERT INTO users (tenant_id, role, email, phone, password_hash, first_name, last_name, status)
                 VALUES (1, 'admin', 'admin@taxi.com', '+491234567890', $1, 'Admin', 'User', 'active')`,
                [passwordHash]
            );
            console.log('✅ Admin user created');
        }

        console.log('\n✅ Login credentials:');
        console.log('   Email: admin@taxi.com');
        console.log('   Password: admin123');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

resetPassword();
