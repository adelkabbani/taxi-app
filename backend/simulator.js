const { Client } = require('pg');
const dotenv = require('dotenv');
const io = require('socket.io-client');

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'taxi_dispatch'
};

const fs = require('fs');
const path = require('path');

function log(msg) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${msg}\n`;
    fs.appendFileSync(path.join(__dirname, 'sim-debug.log'), line);
    console.log(msg);
}

async function simulate() {
    log('Starting simulator...');
    const client = new Client(dbConfig);
    try {
        log('Connecting to DB...');
        await client.connect();
        log('Connected to DB');

        // Get first 3 drivers
        const res = await client.query(`
      SELECT d.id, u.first_name, u.last_name 
      FROM drivers d 
      JOIN users u ON d.user_id = u.id 
      LIMIT 3
    `);

        const drivers = res.rows;
        if (drivers.length === 0) {
            log('No drivers found in database. Run seed script first.');
            process.exit(1);
        }

        log(`Simulating ${drivers.length} drivers: ${drivers.map(d => d.first_name).join(', ')}`);

        // Airport location (Berlin Airport area based on LiveMap.jsx)
        const centerLat = 52.3667;
        const centerLng = 13.5033;

        log('Connecting to socket at http://localhost:3001');
        const socket = io('http://localhost:3001');

        socket.on('connect', () => {
            log('Connected to Backend Socket');

            let step = 0;
            setInterval(async () => {
                step += 0.01;
                for (let i = 0; i < drivers.length; i++) {
                    const d = drivers[i];
                    const lat = centerLat + 0.01 * Math.sin(step + i);
                    const lng = centerLng + 0.01 * Math.cos(step + i);

                    socket.emit('driver_location_update', {
                        driverId: d.id,
                        lat,
                        lng,
                        heading: (step * 57.29) % 360,
                        accuracy: 10
                    });

                    await client.query(
                        'UPDATE drivers SET current_lat = $1, current_lng = $2, location_updated_at = NOW() WHERE id = $3',
                        [lat, lng, d.id]
                    );
                }
            }, 2000);
        });

        socket.on('connect_error', (err) => {
            log('Socket Connection Error: ' + err.message);
        });

    } catch (err) {
        log('Simulator Fatal Error: ' + err.message + '\n' + err.stack);
        process.exit(1);
    }
}

simulate().catch(err => {
    log('Simulator Unhandled Rejection: ' + err.message + '\n' + err.stack);
    process.exit(1);
});
