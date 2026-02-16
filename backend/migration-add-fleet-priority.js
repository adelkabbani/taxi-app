const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'taxi_dispatch',
    user: 'postgres',
    password: 'adel'
});

async function addPriorityColumn() {
    const client = await pool.connect();

    try {
        console.log('Adding priority column to tenants table...');

        // Add priority column with default value 3 (medium priority)
        await client.query(`
            ALTER TABLE tenants 
            ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 3 
            CHECK (priority >= 1 AND priority <= 5)
        `);

        console.log('✅ Successfully added priority column');

        // Show current tenants with their priorities
        const result = await client.query('SELECT id, name, priority FROM tenants ORDER BY id');
        console.log('\nCurrent Tenants:');
        result.rows.forEach(t => {
            console.log(`  ${t.id}. ${t.name} - Priority: ${t.priority}`);
        });

    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

addPriorityColumn();
