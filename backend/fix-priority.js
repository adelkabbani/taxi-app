const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'taxi_dispatch',
    user: 'postgres',
    password: 'adel'
});

async function quickFix() {
    const client = await pool.connect();

    try {
        console.log('🔧 Checking and fixing priority column...\n');

        // 1. Add column if missing
        try {
            await client.query(`
                ALTER TABLE tenants 
                ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 3 
                CHECK (priority >= 1 AND priority <= 5)
            `);
            console.log('✅ Priority column ensured');
        } catch (e) {
            console.log('⚠️  Column might already exist (this is OK)');
        }

        // 2. Update existing tenants to have default priority 3
        await client.query('UPDATE tenants SET priority = 3 WHERE priority IS NULL');
        console.log('✅ Set default priority for existing tenants\n');

        // 3. Show results
        const tenants = await client.query('SELECT id, name, priority FROM tenants ORDER BY id');
        console.log('📊 Current Tenants:');
        tenants.rows.forEach(t => {
            console.log(`  ${t.id}. ${t.name} - Priority: ${t.priority}`);
        });

        console.log('\n🎉 All Done! Now restart your backend server:');
        console.log('   1. Close the Backend terminal window');
        console.log('   2. Run START.bat again');
        console.log('   3. Try changing priority in the UI');

    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

quickFix();
