const { Client } = require('pg');

async function checkUser() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'taxi_dispatch',
        user: 'postgres',
        password: 'adel'
    });

    try {
        await client.connect();

        const result = await client.query(
            `SELECT id, email, role, first_name, last_name, status, tenant_id
             FROM users 
             WHERE email = 'admin@taxi.com'`
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            console.log('\n✅ Admin user found:');
            console.log('   ID:', user.id);
            console.log('   Email:', user.email);
            console.log('   Role:', user.role);
            console.log('   Name:', user.first_name, user.last_name);
            console.log('   Status:', user.status);
            console.log('   Tenant ID:', user.tenant_id);
            console.log('\n📝 Login with:');
            console.log('   Email: admin@taxi.com');
            console.log('   Password: admin123');
        } else {
            console.log('❌ No admin user found!');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await client.end();
    }
}

checkUser();
