require('dotenv').config();
const db = require('./config/database');

async function wakeUpDrivers() {
    try {
        console.log('⚡ Waking up Test Drivers (Updating location & availability)...');

        const driverIds = [11, 12, 13, 14, 15];

        // Update location to "Now" and set to "available"
        // Also setting a random location near Berlin Airport for them to show on the map
        const locations = [
            { lat: 52.3667, lng: 13.5033 }, // BER Airport
            { lat: 52.5200, lng: 13.4050 }, // Alexanderplatz
            { lat: 52.5065, lng: 13.3321 }, // Kurfürstendamm
            { lat: 52.4820, lng: 13.3288 }, // Schöneberg
            { lat: 52.5588, lng: 13.3400 }, // Wedding
        ];

        for (let i = 0; i < driverIds.length; i++) {
            await db.query(`
                UPDATE drivers 
                SET availability = 'available',
                    current_lat = $1,
                    current_lng = $2,
                    location_updated_at = NOW()
                WHERE id = $3
            `, [locations[i].lat, locations[i].lng, driverIds[i]]);
        }

        console.log('✅ 5 drivers are now online and positioned in Berlin!');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        process.exit();
    }
}

wakeUpDrivers();
