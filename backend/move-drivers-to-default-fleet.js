const db = require('./config/database');

async function moveDriversToDefaultFleet() {
    try {
        // 1. Get the Default Taxi Company tenant ID
        const tenantResult = await db.query(
            "SELECT id FROM tenants WHERE name = 'Default Taxi Company'"
        );

        if (tenantResult.rows.length === 0) {
            console.log('❌ Default Taxi Company not found. Creating it...');
            const createResult = await db.query(
                "INSERT INTO tenants (name, contact_email, contact_phone) VALUES ('Default Taxi Company', 'contact@default.com', '+1234567890') RETURNING id"
            );
            var defaultTenantId = createResult.rows[0].id;
            console.log('✅ Created Default Taxi Company with ID:', defaultTenantId);
        } else {
            var defaultTenantId = tenantResult.rows[0].id;
            console.log('✅ Found Default Taxi Company with ID:', defaultTenantId);
        }

        // 2. Get 3 drivers from Berlin Taxi Co to move
        const driversToMove = await db.query(`
            SELECT u.id, u.first_name, u.last_name, d.id as driver_id
            FROM users u
            JOIN drivers d ON u.id = d.user_id
            JOIN tenants t ON u.tenant_id = t.id
            WHERE t.name = 'Berlin Taxi Co'
            LIMIT 3
        `);

        if (driversToMove.rows.length === 0) {
            console.log('❌ No drivers found to move!');
            process.exit(1);
        }

        console.log(`\n📦 Moving ${driversToMove.rows.length} drivers to Default Taxi Company...\n`);

        // 3. Move each driver
        for (const driver of driversToMove.rows) {
            await db.query(
                'UPDATE users SET tenant_id = $1 WHERE id = $2',
                [defaultTenantId, driver.id]
            );

            // Also update their vehicle's tenant
            await db.query(`
                UPDATE vehicles 
                SET tenant_id = $1 
                WHERE id = (SELECT vehicle_id FROM drivers WHERE id = $2)
            `, [defaultTenantId, driver.driver_id]);

            console.log(`✅ Moved: ${driver.first_name} ${driver.last_name}`);
        }

        console.log('\n🎉 Successfully moved drivers to Default Taxi Company!');
        console.log('\nRefresh your Driver Management page to see both fleets in the dropdown.');

        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
}

moveDriversToDefaultFleet();
