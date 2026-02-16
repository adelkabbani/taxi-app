const bcrypt = require('bcrypt');
const db = require('../config/database');
const geoUtils = require('../utils/geoUtils');
const logger = require('../config/logger');
const { AppError } = require('../middleware/errorHandler');

/**
 * Driver Service
 * Handles driver location, availability, and tracking logic
 */

/**
 * Get all drivers with filters
 */
const getAllDrivers = async (filters, tenantId) => {
    const { availability, includeStale, search, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let query = `
    SELECT 
      d.*,
      u.first_name, u.last_name, u.email, u.phone,
      v.license_plate, v.vehicle_type,
      dm.acceptance_rate, dm.total_bookings, dm.cancelled_bookings,
      t.name AS company_name,
      t.id AS tenant_id,
      CASE 
        WHEN d.location_updated_at > NOW() - INTERVAL '${process.env.LOCATION_STALENESS_TIMEOUT_SECONDS || 60} seconds' THEN false
        ELSE true
      END AS is_stale
    FROM drivers d
    JOIN users u ON d.user_id = u.id
    JOIN tenants t ON u.tenant_id = t.id
    LEFT JOIN vehicles v ON d.vehicle_id = v.id
    LEFT JOIN driver_metrics dm ON d.id = dm.driver_id
    WHERE 1=1
  `;

    const params = [];
    let paramIndex = 1;

    // Optional Tenant Filter
    if (tenantId) {
        query += ` AND u.tenant_id = $${paramIndex}`;
        params.push(tenantId);
        paramIndex++;
    }

    if (availability) {
        query += ` AND d.availability = $${paramIndex}`;
        params.push(availability);
        paramIndex++;
    }

    if (search) {
        query += ` AND (
            u.first_name ILIKE $${paramIndex} OR 
            u.last_name ILIKE $${paramIndex} OR 
            v.license_plate ILIKE $${paramIndex}
        )`;
        params.push(`%${search}%`);
        paramIndex++;
    }

    if (!includeStale && !search) { // Only filter stale if not searching specific driver
        query += ` AND d.location_updated_at > NOW() - INTERVAL '${process.env.LOCATION_STALENESS_TIMEOUT_SECONDS || 60} seconds'`;
    }


    query += ` ORDER BY d.id LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get active suspensions
    const suspensions = await db.query(`
        SELECT driver_id, reason, expires_at 
        FROM driver_suspensions 
        WHERE is_active = true 
        AND (expires_at IS NULL OR expires_at > NOW())
    `);

    const suspensionMap = {};
    suspensions.rows.forEach(s => suspensionMap[s.driver_id] = s);

    return result.rows.map(r => ({
        ...r,
        suspension: suspensionMap[r.id] || null
    }));
};

/**
 * Get driver by ID with full details
 */
const getDriverById = async (driverId, tenantId) => {
    let query = `SELECT 
      d.*,
      u.first_name, u.last_name, u.email, u.phone, u.plain_password,
      v.license_plate, v.vehicle_type, v.make, v.model,
      vc.luggage_capacity, vc.passenger_capacity, vc.has_child_seat, vc.has_airport_permit,
      dc.languages,
      dm.acceptance_rate, dm.total_bookings, dm.accepted_bookings, dm.rejected_bookings,
      dm.cancelled_bookings, dm.late_arrivals, dm.no_shows,
      CASE 
        WHEN d.location_updated_at > NOW() - INTERVAL '${process.env.LOCATION_STALENESS_TIMEOUT_SECONDS || 60} seconds' THEN false
        ELSE true
      END AS is_stale
    FROM drivers d
    JOIN users u ON d.user_id = u.id
    LEFT JOIN vehicles v ON d.vehicle_id = v.id
    LEFT JOIN vehicle_capabilities vc ON v.id = vc.vehicle_id
    LEFT JOIN driver_capabilities dc ON d.id = dc.driver_id
    LEFT JOIN driver_metrics dm ON d.id = dm.driver_id
    WHERE d.id = $1`;

    const params = [driverId];

    if (tenantId) {
        query += ` AND u.tenant_id = $2`;
        params.push(tenantId);
    }

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
        throw new AppError('Driver not found', 404);
    }

    return result.rows[0];
};

/**
 * Update driver location
 */
const updateLocation = async (driverId, locationData) => {
    const { lat, lng, accuracy, heading, speed } = locationData;

    try {
        return await db.transaction(async (client) => {
            // Update current location in drivers table
            await client.query(
                `UPDATE drivers 
         SET current_lat = $1, current_lng = $2, location_updated_at = NOW()
         WHERE id = $3`,
                [lat, lng, driverId]
            );

            // Insert into location history
            await client.query(
                `INSERT INTO location_updates (driver_id, lat, lng, accuracy_m, heading, speed_kmh)
         VALUES ($1, $2, $3, $4, $5, $6)`,
                [driverId, lat, lng, accuracy, heading, speed]
            );

            logger.debug('Driver location updated', {
                driverId,
                lat,
                lng,
                accuracy,
                heading,
                speed
            });

            return { success: true };
        });
    } catch (error) {
        logger.error('Failed to update driver location', { driverId, error: error.message });
        throw error;
    }
};

/**
 * Update driver availability
 */
const updateAvailability = async (driverId, availability, userId, userRole) => {
    // Check permission: driver can only update their own, admin can update anyone's
    if (userRole !== 'admin') {
        const driverCheck = await db.query(
            'SELECT id FROM drivers WHERE id = $1 AND user_id = $2',
            [driverId, userId]
        );

        if (driverCheck.rows.length === 0) {
            throw new AppError('You can only update your own availability', 403);
        }
    }

    const result = await db.query(
        `UPDATE drivers SET availability = $1 WHERE id = $2 RETURNING *`,
        [availability, driverId]
    );

    if (result.rows.length === 0) {
        throw new AppError('Driver not found', 404);
    }

    logger.info('Driver availability updated', { driverId, availability });

    return result.rows[0];
};

/**
 * Find nearby drivers
 */
const findNearbyDrivers = async (lat, lng, filters, tenantId) => {
    const { radius = 5000, vehicleType, requireAirportPermit } = filters;

    // Get all available drivers with fresh locations
    let query = `
    SELECT 
      d.id, d.current_lat, d.current_lng, d.location_updated_at,
      u.first_name || ' ' || u.last_name AS driver_name,
      v.vehicle_type, v.license_plate,
      vc.has_airport_permit,
      dm.acceptance_rate
    FROM drivers d
    JOIN users u ON d.user_id = u.id
    LEFT JOIN vehicles v ON d.vehicle_id = v.id
    LEFT JOIN vehicle_capabilities vc ON v.id = vc.vehicle_id
    LEFT JOIN driver_metrics dm ON d.id = dm.driver_id
    WHERE d.availability = 'available'
      AND d.current_lat IS NOT NULL
      AND d.location_updated_at > NOW() - INTERVAL '${process.env.LOCATION_STALENESS_TIMEOUT_SECONDS || 60} seconds'
  `;

    const params = [];
    let paramIndex = 1;

    if (tenantId) {
        query += ` AND u.tenant_id = $${paramIndex}`;
        params.push(tenantId);
        paramIndex++;
    }

    if (vehicleType) {
        query += ` AND v.vehicle_type = $${paramIndex}`;
        params.push(vehicleType);
        paramIndex++;
    }

    if (requireAirportPermit) {
        query += ` AND vc.has_airport_permit = true`;
    }

    const result = await db.query(query, params);

    // Calculate distances and filter by radius
    const driversWithDistance = result.rows
        .map(driver => {
            const distance = geoUtils.calculateDistance(
                lat,
                lng,
                driver.current_lat,
                driver.current_lng
            );

            return {
                ...driver,
                distance_meters: Math.round(distance),
                distance_km: (distance / 1000).toFixed(2)
            };
        })
        .filter(driver => driver.distance_meters <= radius)
        .sort((a, b) => a.distance_meters - b.distance_meters);

    return driversWithDistance;
};

/**
 * Start driver shift
 */
const startShift = async (driverId) => {
    // Check if there's already an active shift
    const activeShift = await db.query(
        'SELECT id FROM driver_shifts WHERE driver_id = $1 AND ended_at IS NULL',
        [driverId]
    );

    if (activeShift.rows.length > 0) {
        throw new AppError('Shift already started', 400);
    }

    const result = await db.query(
        `INSERT INTO driver_shifts (driver_id, started_at)
     VALUES ($1, NOW())
     RETURNING *`,
        [driverId]
    );

    logger.info('Driver shift started', { driverId, shiftId: result.rows[0].id });

    return result.rows[0];
};

/**
 * End driver shift
 */
const endShift = async (driverId) => {
    const result = await db.query(
        `UPDATE driver_shifts 
     SET ended_at = NOW(),
         total_driving_minutes = EXTRACT(EPOCH FROM (NOW() - started_at)) / 60
     WHERE driver_id = $1 AND ended_at IS NULL
     RETURNING *`,
        [driverId]
    );

    if (result.rows.length === 0) {
        throw new AppError('No active shift found', 404);
    }

    logger.info('Driver shift ended', { driverId, shiftId: result.rows[0].id });

    return result.rows[0];
};

/**
 * Start break
 */
const startBreak = async (driverId) => {
    // Get active shift
    const shiftResult = await db.query(
        'SELECT id FROM driver_shifts WHERE driver_id = $1 AND ended_at IS NULL',
        [driverId]
    );

    if (shiftResult.rows.length === 0) {
        throw new AppError('No active shift. Start shift first.', 400);
    }

    const shiftId = shiftResult.rows[0].id;

    // Check if already on break
    const activeBreak = await db.query(
        'SELECT id FROM driver_breaks WHERE shift_id = $1 AND ended_at IS NULL',
        [shiftId]
    );

    if (activeBreak.rows.length > 0) {
        throw new AppError('Break already started', 400);
    }

    const result = await db.query(
        `INSERT INTO driver_breaks (shift_id, started_at)
     VALUES ($1, NOW())
     RETURNING *`,
        [shiftId]
    );

    logger.info('Driver break started', { driverId, breakId: result.rows[0].id });

    return result.rows[0];
};

/**
 * End break
 */
const endBreak = async (driverId) => {
    const result = await db.query(
        `UPDATE driver_breaks db
     SET ended_at = NOW()
     FROM driver_shifts ds
     WHERE db.shift_id = ds.id
       AND ds.driver_id = $1
       AND db.ended_at IS NULL
     RETURNING db.*`,
        [driverId]
    );

    if (result.rows.length === 0) {
        throw new AppError('No active break found', 404);
    }

    logger.info('Driver break ended', { driverId, breakId: result.rows[0].id });

    return result.rows[0];
};

/**
 * Create a new driver with user and vehicle
 */
const createDriver = async (driverData, tenantId) => {
    const {
        firstName, lastName, email, phone, password,
        licensePlate, make, model, year, vehicleType,
        licenseNumber
    } = driverData;

    try {
        return await db.transaction(async (client) => {
            // 1. Create User
            const passwordHash = await bcrypt.hash(password, 10);
            const userResult = await client.query(
                `INSERT INTO users (tenant_id, role, email, phone, password_hash, plain_password, first_name, last_name)
                 VALUES ($1, 'driver', $2, $3, $4, $5, $6, $7)
                 RETURNING id`,
                [tenantId, email, phone, passwordHash, password, firstName, lastName]
            );
            const userId = userResult.rows[0].id;

            // 2. Create Vehicle
            const vehicleResult = await client.query(
                `INSERT INTO vehicles (tenant_id, license_plate, make, model, year, vehicle_type)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id`,
                [tenantId, licensePlate, make, model, year, vehicleType]
            );
            const vehicleId = vehicleResult.rows[0].id;

            // 3. Create Driver Profile
            const driverResult = await client.query(
                `INSERT INTO drivers (user_id, vehicle_id, license_number, availability)
                 VALUES ($1, $2, $3, 'offline')
                 RETURNING id`,
                [userId, vehicleId, licenseNumber]
            );

            // 4. Initialize metrics
            await client.query(
                `INSERT INTO driver_metrics (driver_id) VALUES ($1)`,
                [driverResult.rows[0].id]
            );

            return {
                id: driverResult.rows[0].id,
                userId,
                vehicleId
            };
        });
    } catch (error) {
        logger.error('Failed to create driver', { error: error.message, driverData });
        throw error;
    }
};

/**
 * Suspend a driver
 */
const suspendDriver = async (driverId, suspensionData, createdBy) => {
    const { reason, expiresAt } = suspensionData;

    return await db.transaction(async (client) => {
        // 1. Deactivate any existing active suspensions
        await client.query(
            'UPDATE driver_suspensions SET is_active = false WHERE driver_id = $1',
            [driverId]
        );

        // 2. Insert new suspension
        const result = await client.query(
            `INSERT INTO driver_suspensions (driver_id, reason, expires_at, created_by)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [driverId, reason, expiresAt || null, createdBy]
        );

        // 3. Set driver availability to offline
        await client.query(
            "UPDATE drivers SET availability = 'offline' WHERE id = $1",
            [driverId]
        );

        // 4. Update user status to 'suspended' to block login/access
        const driver = await client.query('SELECT user_id FROM drivers WHERE id = $1', [driverId]);
        if (driver.rows.length > 0) {
            await client.query(
                "UPDATE users SET status = 'suspended' WHERE id = $1",
                [driver.rows[0].user_id]
            );
        }

        logger.info('Driver suspended and user access blocked', { driverId, reason, expiresAt });
        return result.rows[0];
    });
};

/**
 * Unsuspend a driver
 */
const unsuspendDriver = async (driverId) => {
    return await db.transaction(async (client) => {
        // 1. Deactivate suspension
        await client.query(
            'UPDATE driver_suspensions SET is_active = false WHERE driver_id = $1',
            [driverId]
        );

        // 2. Reactivate user account
        const driver = await client.query('SELECT user_id FROM drivers WHERE id = $1', [driverId]);
        if (driver.rows.length > 0) {
            await client.query(
                "UPDATE users SET status = 'active' WHERE id = $1",
                [driver.rows[0].user_id]
            );
        }

        logger.info('Driver unsuspended and user access restored', { driverId });
        return { success: true };
    });
};

/**
 * Update driver password
 */
const updateDriverPassword = async (driverId, newPassword) => {
    // 1. Get user_id from driver
    const driver = await db.query('SELECT user_id FROM drivers WHERE id = $1', [driverId]);

    if (driver.rows.length === 0) {
        throw new AppError('Driver not found', 404);
    }

    // 2. Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // 3. Update users table with hash AND plain text
    await db.query(
        'UPDATE users SET password_hash = $1, plain_password = $2 WHERE id = $3',
        [passwordHash, newPassword, driver.rows[0].user_id]
    );

    logger.info('Driver password updated via admin override', { driverId });
    return true;
};

module.exports = {
    getAllDrivers,
    getDriverById,
    createDriver,
    updateLocation,
    updateAvailability,
    findNearbyDrivers,
    startShift,
    endShift,
    startBreak,
    endBreak,
    suspendDriver,
    unsuspendDriver,
    updateDriverPassword
};
