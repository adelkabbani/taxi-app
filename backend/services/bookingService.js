const db = require('../config/database');
const geoUtils = require('../utils/geoUtils');
const eventLogger = require('./eventLogger');
const logger = require('../config/logger');
const { AppError } = require('../middleware/errorHandler');

/**
 * Booking Service
 * Core business logic for booking lifecycle
 */

/**
 * Create new booking
 */
const createBooking = async (bookingData, createdBy) => {
    const {
        passengerId,
        passengerPhone,
        passengerName,
        partnerId,
        pickupAddress,
        pickupLat,
        pickupLng,
        dropoffAddress,
        dropoffLat,
        dropoffLng,
        scheduledPickupTime,
        fareEstimate,
        paymentMethod,
        passengerNotes,
        requirements,
        source,
        externalReference,
        flightNumber,
        serviceType,
        groupId
    } = bookingData;

    try {
        // Check for Stop Sell
        const tenantSettings = await db.query('SELECT stop_sell FROM tenants WHERE id = $1', [createdBy.tenantId]);
        if (tenantSettings.rows.length > 0 && tenantSettings.rows[0].stop_sell) {
            throw new AppError('Stop Sell is active. No more bookings are currently accepted.', 403);
        }

        return await db.transaction(async (client) => {
            // Generate booking reference
            const reference = `TX-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

            // Determine source
            const bookingSource = source || (partnerId ? 'partner' : 'manual');

            // Insert booking
            const bookingResult = await client.query(
                `INSERT INTO bookings (
          tenant_id, booking_reference, passenger_id, partner_id, created_by_user_id,
          passenger_name, passenger_phone, source, external_reference,
          pickup_address, pickup_lat, pickup_lng,
          dropoff_address, dropoff_lat, dropoff_lng,
          scheduled_pickup_time, fare_estimate, payment_method, passenger_notes, status,
          flight_number, service_type, group_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING *`,

                [
                    createdBy.tenantId,
                    reference,
                    passengerId || null,
                    partnerId || null,
                    createdBy.id,
                    passengerName || null,
                    passengerPhone || null,
                    bookingSource,
                    externalReference || null,
                    pickupAddress,
                    pickupLat,
                    pickupLng,
                    dropoffAddress || null,
                    dropoffLat || null,
                    dropoffLng || null,
                    scheduledPickupTime || null,
                    fareEstimate || null,
                    paymentMethod || 'cash',
                    passengerNotes || null,
                    'pending',
                    bookingData.flightNumber || null,
                    bookingData.serviceType || 'standard',
                    bookingData.groupId || null
                ]
            );

            const booking = bookingResult.rows[0];

            // Insert requirements if provided
            if (requirements) {
                await client.query(
                    `INSERT INTO booking_requirements(
                booking_id, vehicle_type, min_luggage_capacity,
                needs_child_seat, needs_accessibility, preferred_language, requires_airport_permit
            ) VALUES($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        booking.id,
                        requirements.vehicleType,
                        requirements.minLuggageCapacity,
                        requirements.needsChildSeat || false,
                        requirements.needsAccessibility || false,
                        requirements.preferredLanguage,
                        requirements.requiresAirportPermit || false
                    ]
                );
            }

            // Log event
            await eventLogger.logBookingCreated(
                booking.id,
                createdBy.tenantId,
                createdBy,
                {
                    pickup: pickupAddress,
                    dropoff: dropoffAddress,
                    scheduledTime: scheduledPickupTime,
                    partnerId
                },
                client
            );

            logger.info('Booking created', {
                bookingId: booking.id,
                reference: booking.booking_reference,
                createdBy: createdBy.id
            });

            return booking;
        });
    } catch (error) {
        logger.error('Failed to create booking', { error: error.message });
        throw error;
    }
};

/**
 * Assign driver to booking
 */
const assignDriver = async (bookingId, driverId, assignedBy) => {
    try {
        return await db.transaction(async (client) => {
            // Get booking
            const bookingResult = await client.query(
                'SELECT * FROM bookings WHERE id = $1',
                [bookingId]
            );

            if (bookingResult.rows.length === 0) {
                throw new AppError('Booking not found', 404);
            }

            const booking = bookingResult.rows[0];

            if (booking.status !== 'pending') {
                throw new AppError(`Cannot assign driver.Booking status is ${booking.status} `, 400);
            }

            // Check driver availability
            const driverResult = await client.query(
                'SELECT * FROM drivers WHERE id = $1 AND availability = $2',
                [driverId, 'available']
            );

            if (driverResult.rows.length === 0) {
                throw new AppError('Driver not available', 400);
            }

            // Update booking
            const updated = await client.query(
                `UPDATE bookings 
         SET driver_id = $1, vehicle_id = $2, status = 'assigned', assigned_at = NOW()
         WHERE id = $3
            RETURNING * `,
                [driverId, driverResult.rows[0].vehicle_id, bookingId]
            );

            // Update driver status
            await client.query(
                `UPDATE drivers SET availability = 'busy' WHERE id = $1`,
                [driverId]
            );

            // Log event
            await eventLogger.logDriverAssigned(
                bookingId,
                booking.tenant_id,
                driverId,
                assignedBy,
                client
            );

            logger.info('Driver assigned to booking', {
                bookingId,
                driverId
            });

            return updated.rows[0];
        });
    } catch (error) {
        logger.error('Failed to assign driver', { bookingId, driverId, error: error.message });
        throw error;
    }
};

/**
 * Driver accepts booking
 */
const acceptBooking = async (bookingId, driverId) => {
    try {
        return await db.transaction(async (client) => {
            const result = await client.query(
                'SELECT * FROM bookings WHERE id = $1 AND driver_id = $2',
                [bookingId, driverId]
            );

            if (result.rows.length === 0) {
                throw new AppError('Booking not found or not assigned to you', 404);
            }

            const booking = result.rows[0];

            if (booking.status !== 'assigned') {
                throw new AppError(`Cannot accept.Booking status is ${booking.status} `, 400);
            }

            const updated = await client.query(
                `UPDATE bookings SET status = 'accepted', accepted_at = NOW()
         WHERE id = $1
            RETURNING * `,
                [bookingId]
            );

            // Update driver metrics
            await client.query(
                `UPDATE driver_metrics 
         SET accepted_bookings = accepted_bookings + 1,
                total_bookings = total_bookings + 1,
                acceptance_rate = (accepted_bookings:: float / NULLIF(total_bookings, 0)) * 100,
            last_calculated_at = NOW()
         WHERE driver_id = $1`,
                [driverId]
            );

            await eventLogger.logDriverAccepted(bookingId, booking.tenant_id, driverId, client);

            logger.info('Booking accepted by driver', { bookingId, driverId });

            return updated.rows[0];
        });
    } catch (error) {
        logger.error('Failed to accept booking', { bookingId, driverId, error: error.message });
        throw error;
    }
};

/**
 * Driver marks arrived (with geo-check)
 */
const markArrived = async (bookingId, driverId, location) => {
    try {
        return await db.transaction(async (client) => {
            const result = await client.query(
                'SELECT * FROM bookings WHERE id = $1 AND driver_id = $2',
                [bookingId, driverId]
            );

            if (result.rows.length === 0) {
                throw new AppError('Booking not found', 404);
            }

            const booking = result.rows[0];

            if (booking.status !== 'accepted') {
                throw new AppError(`Cannot mark arrived.Booking status is ${booking.status} `, 400);
            }

            // Perform geo-check
            const geoCheck = geoUtils.validateArrivalLocation(
                location.lat,
                location.lng,
                booking.pickup_lat,
                booking.pickup_lng,
                location.accuracy
            );

            if (!geoCheck.passed) {
                const requireOverride = !geoCheck.accuracyAcceptable;

                logger.warn('Geo-check failed for arrival', {
                    bookingId,
                    driverId,
                    distance: geoCheck.distance,
                    accuracy: location.accuracy,
                    requireOverride
                });

                if (requireOverride) {
                    throw new AppError(
                        `GPS accuracy too low(${location.accuracy}m).Cannot verify arrival.Admin override required.`,
                        400
                    );
                }

                if (!geoCheck.withinRadius) {
                    throw new AppError(
                        `You are ${Math.round(geoCheck.distance)}m from pickup point.Must be within ${process.env.ARRIVAL_GEO_CHECK_RADIUS_METERS || 150}m to mark arrived.`,
                        400
                    );
                }
            }

            // Update booking status
            const updated = await client.query(
                `UPDATE bookings 
         SET status = 'arrived', arrived_at = NOW()
         WHERE id = $1
        RETURNING * `,
                [bookingId]
            );

            // Trigger waiting_started automatically
            await client.query(
                `UPDATE bookings SET status = 'waiting_started', waiting_started_at = NOW()
         WHERE id = $1`,
                [bookingId]
            );

            // Log events
            await eventLogger.logDriverArrived(bookingId, booking.tenant_id, driverId, {
                ...location,
                geoCheckPassed: geoCheck.passed,
                distanceFromPickup: geoCheck.distance
            }, client);

            await eventLogger.logWaitingStarted(bookingId, booking.tenant_id, client);

            logger.info('Driver arrived and waiting started', {
                bookingId,
                driverId,
                geoCheckPassed: geoCheck.passed,
                distance: geoCheck.distance
            });

            return updated.rows[0];
        });
    } catch (error) {
        logger.error('Failed to mark arrived', { bookingId, driverId, error: error.message });
        throw error;
    }
};

/**
 * Start trip
 */
const startTrip = async (bookingId, driverId) => {
    try {
        const result = await db.query(
            `UPDATE bookings 
       SET status = 'started', started_at = NOW()
       WHERE id = $1 AND driver_id = $2 AND status = 'waiting_started'
        RETURNING * `,
            [bookingId, driverId]
        );

        if (result.rows.length === 0) {
            throw new AppError('Cannot start trip. Check booking status.', 400);
        }

        const booking = result.rows[0];

        logger.info('Trip started', { bookingId, driverId });

        return booking;
    } catch (error) {
        logger.error('Failed to start trip', { bookingId, driverId, error: error.message });
        throw error;
    }
};

/**
 * Complete trip
 */
const completeTrip = async (bookingId, driverId, completionData) => {
    try {
        return await db.transaction(async (client) => {
            const { fareFinal, driverNotes } = completionData;

            const result = await client.query(
                `UPDATE bookings 
         SET status = 'completed', completed_at = NOW(),
            fare_final = COALESCE($1, fare_estimate),
            driver_notes = $2
         WHERE id = $3 AND driver_id = $4 AND status = 'started'
        RETURNING * `,
                [fareFinal, driverNotes, bookingId, driverId]
            );

            if (result.rows.length === 0) {
                throw new AppError('Cannot complete trip. Check booking status.', 400);
            }

            const booking = result.rows[0];

            // Update driver to available
            await client.query(
                `UPDATE drivers SET availability = 'available' WHERE id = $1`,
                [driverId]
            );

            logger.info('Trip completed', { bookingId, driverId, fareFinal });

            return booking;
        });
    } catch (error) {
        logger.error('Failed to complete trip', { bookingId, driverId, error: error.message });
        throw error;
    }
};

/**
 * Request no-show (requires evidence)
 */
const requestNoShow = async (bookingId, driverId, evidenceIds, notes) => {
    try {
        return await db.transaction(async (client) => {
            const result = await client.query(
                'SELECT * FROM bookings WHERE id = $1 AND driver_id = $2',
                [bookingId, driverId]
            );

            if (result.rows.length === 0) {
                throw new AppError('Booking not found', 404);
            }

            const booking = result.rows[0];

            if (!['waiting_started', 'arrived'].includes(booking.status)) {
                throw new AppError(`Cannot request no - show from status ${booking.status} `, 400);
            }

            // Check if waiting time requirement met
            const freeWaitMinutes = parseInt(process.env.NO_SHOW_WAIT_TIME_MINUTES) || 10;
            const waitedMinutes = (Date.now() - new Date(booking.arrived_at)) / 60000;

            if (waitedMinutes < freeWaitMinutes) {
                throw new AppError(
                    `Must wait at least ${freeWaitMinutes} minutes before requesting no - show.Waited: ${Math.floor(waitedMinutes)} minutes.`,
                    400
                );
            }

            // Verify evidence exists
            const evidenceResult = await client.query(
                'SELECT COUNT(*) FROM proof_assets WHERE booking_id = $1 AND id = ANY($2)',
                [bookingId, evidenceIds]
            );

            if (parseInt(evidenceResult.rows[0].count) !== evidenceIds.length) {
                throw new AppError('Invalid evidence IDs provided', 400);
            }

            // Update status
            const updated = await client.query(
                `UPDATE bookings SET status = 'no_show_requested'
         WHERE id = $1
        RETURNING * `,
                [bookingId]
            );

            await eventLogger.logNoShowRequested(bookingId, booking.tenant_id, driverId, evidenceIds, client);

            logger.info('No-show requested', { bookingId, driverId, evidenceCount: evidenceIds.length });

            return updated.rows[0];
        });
    } catch (error) {
        logger.error('Failed to request no-show', { bookingId, driverId, error: error.message });
        throw error;
    }
};

/**
 * Confirm no-show (admin only)
 */
const confirmNoShow = async (bookingId, adminId, tenantId) => {
    try {
        return await db.transaction(async (client) => {
            const result = await client.query(
                'SELECT * FROM bookings WHERE id = $1',
                [bookingId]
            );

            if (result.rows.length === 0) {
                throw new AppError('Booking not found', 404);
            }

            const booking = result.rows[0];

            if (booking.status !== 'no_show_requested') {
                throw new AppError(`Cannot confirm no - show.Status is ${booking.status} `, 400);
            }

            // Calculate no-show fee
            const feeResult = await client.query(
                'SELECT get_no_show_fee($1) as fee',
                [bookingId]
            );
            const noShowFee = parseFloat(feeResult.rows[0].fee) || 0;

            // Update booking
            const updated = await client.query(
                `UPDATE bookings 
         SET status = 'no_show_confirmed',
            no_show_fee = $1,
            completed_at = NOW()
         WHERE id = $2
        RETURNING * `,
                [noShowFee, bookingId]
            );

            // Free up driver
            if (booking.driver_id) {
                await client.query(
                    `UPDATE drivers SET availability = 'available' WHERE id = $1`,
                    [booking.driver_id]
                );
            }

            await eventLogger.logNoShowConfirmed(
                bookingId,
                tenantId,
                { type: 'admin', id: adminId },
                noShowFee,
                client
            );

            logger.info('No-show confirmed', { bookingId, adminId, noShowFee });

            return updated.rows[0];
        });
    } catch (error) {
        logger.error('Failed to confirm no-show', { bookingId, error: error.message });
        throw error;
    }
};

module.exports = {
    createBooking,
    assignDriver,
    acceptBooking,
    markArrived,
    startTrip,
    completeTrip,
    requestNoShow,
    confirmNoShow
};
