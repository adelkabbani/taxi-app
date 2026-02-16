require('dotenv').config();
const db = require('./config/database');

async function moveDriversData() {
    try {
        console.log('🚀 Moving demo drivers to Tenant 3 and marking as Test Drivers...');

        // IDs of the demo drivers identified from db_debug.txt
        const driverIds = [11, 12, 13, 14, 15];

        await db.transaction(async (client) => {
            // 1. Get the user_ids and vehicle_ids for these drivers
            const driverInfo = await client.query(`
                SELECT id, user_id, vehicle_id FROM drivers WHERE id = ANY($1)
            `, [driverIds]);

            console.log('Drivers found:', driverInfo.rows.length);

            const userIds = driverInfo.rows.map(r => r.user_id);
            const vehicleIds = driverInfo.rows.map(r => r.vehicle_id).filter(id => id !== null);

            if (userIds.length === 0) {
                console.log('❌ No demo drivers found to move.');
                return;
            }

            // 2. Update Users (Change Tenant to 3 and append " (Test)" to Last Name)
            // Use TRIM to avoid double appending if run twice
            const userUpdate = await client.query(`
                UPDATE users 
                SET tenant_id = 3, 
                    last_name = CASE 
                        WHEN last_name NOT LIKE '%(Test)' THEN last_name || ' (Test)'
                        ELSE last_name
                    END
                WHERE id = ANY($1)
                RETURNING id, tenant_id, last_name
            `, [userIds]);
            console.log(`✅ Updated ${userUpdate.rows.length} users.`);
            console.table(userUpdate.rows);

            // 3. Update Vehicles (Change Tenant to 3)
            if (vehicleIds.length > 0) {
                const vehicleUpdate = await client.query(`
                    UPDATE vehicles 
                    SET tenant_id = 3
                    WHERE id = ANY($1)
                    RETURNING id, tenant_id
                `, [vehicleIds]);
                console.log(`✅ Updated ${vehicleUpdate.rows.length} vehicles.`);
            }

            console.log('🎉 Migration complete!');
        });

    } catch (err) {
        console.error('❌ Error during move:', err.message);
    } finally {
        process.exit();
    }
}

moveDriversData();
