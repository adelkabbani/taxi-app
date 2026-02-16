const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function generatePasswordHash() {
    console.log('\n🔐 Password Hash Generator for Fleet Command\n');
    console.log('This tool generates bcrypt password hashes for database insertion.\n');

    rl.question('Enter password to hash (or press Enter for default "admin123"): ', async (password) => {
        const pwd = password || 'admin123';

        try {
            const hash = await bcrypt.hash(pwd, 10);

            console.log('\n' + '='.repeat(60));
            console.log('✅ Password Hash Generated!');
            console.log('='.repeat(60));
            console.log('\nPassword:', pwd);
            console.log('\nBcrypt Hash:');
            console.log(hash);
            console.log('\n' + '='.repeat(60));
            console.log('\n📋 Full SQL INSERT Statement:\n');
            console.log(`INSERT INTO users (tenant_id, email, password, first_name, last_name, phone, role, is_active)
SELECT id, 'admin@fleet.com', '${hash}', 'Admin', 'User', '+1234567890', 'admin', true
FROM tenants WHERE slug = 'default' LIMIT 1;`);
            console.log('\n' + '='.repeat(60) + '\n');

            rl.close();
        } catch (error) {
            console.error('❌ Error generating hash:', error.message);
            rl.close();
            process.exit(1);
        }
    });
}

generatePasswordHash();
