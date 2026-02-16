const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'taxi_dispatch',
    user: 'postgres',
    password: 'adel'
});

async function checkPriorityColumn() {
    const client = await pool.connect();

    try {
        // Check if priority column exists
        const columnCheck = await client.query(`
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'tenants' AND column_name = 'priority'
        `);

        if (columnCheck.rows.length === 0) {
            console.log('❌ Priority column does NOT exist');
            console.log('Running migration now...');

            await client.query(`
                ALTER TABLE tenants 
                ADD COLUMN priority INTEGER DEFAULT 3 
                CHECK (priority >= 1 AND priority <= 5)
            `);

            console.log('✅ Priority column added successfully!');
        } else {
            console.log('✅ Priority column exists:');
            console.log(columnCheck.rows[0]);
        }

        // Show current tenants with priorities
        const tenants = await client.query('SELECT id, name, priority FROM tenants ORDER BY id');
        console.log('\n📊 Current Tenants:');
        tenants.rows.forEach(t => {
            console.log(`  ${t.id}. ${t.name} - Priority: ${t.priority || 'NULL (will use default 3)'}`);
        });

    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkPriorityColumn();
