const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'taxi_dispatch',
    user: 'postgres',
    password: 'adel'
});

async function moveDrivers() {
    const client = await pool.connect();

    try {
        // Get tenant IDs
        const tenants = await client.query("SELECT id, name FROM tenants ORDER BY id");
        console.log('\nTenants:');
        tenants.rows.forEach(t => console.log(`  ${t.id}: ${t.name}`));

        const berlinId = tenants.rows.find(t => t.name.includes('Berlin')).id;
        const defaultId = tenants.rows.find(t => t.name.includes('Default')).id;

        console.log(`\nMoving 3 drivers from tenant ${berlinId} to tenant ${defaultId}...`);

        // Get 3 drivers to move
        const drivers = await client.query(`
            SELECT u.id, u.first_name, u.last_name, d.id as driver_id, d.vehicle_id
            FROM users u
            JOIN drivers d ON u.id = d.user_id
            WHERE u.tenant_id = $1 AND u.role = 'driver'
            LIMIT 3
        `, [berlinId]);

        // Move each driver
        for (const driver of drivers.rows) {
            await client.query('UPDATE users SET tenant_id = $1 WHERE id = $2', [defaultId, driver.id]);
            await client.query('UPDATE vehicles SET tenant_id = $1 WHERE id = $2', [defaultId, driver.vehicle_id]);
            console.log(`✅ Moved: ${driver.first_name} ${driver.last_name}`);
        }

        // Show final distribution
        const distribution = await client.query(`
            SELECT t.name, COUNT(d.id) as driver_count
            FROM tenants t
            LEFT JOIN users u ON t.id = u.tenant_id AND u.role = 'driver'
            LEFT JOIN drivers d ON u.id = d.user_id
            GROUP BY t.name
            ORDER BY t.name
        `);

        console.log('\n=== FINAL DISTRIBUTION ===');
        distribution.rows.forEach(row => {
            console.log(`${row.name}: ${row.driver_count} drivers`);
        });

        console.log('\n🎉 Done! Refresh your Driver Management page.');

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

moveDrivers();
