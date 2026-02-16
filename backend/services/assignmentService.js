const db = require('../config/database');
const logger = require('../config/logger');
const driverScheduleService = require('./driverScheduleService');
const eventLogger = require('./eventLogger');
const { AppError } = require('../middleware/errorHandler');

/**
 * Assignment Service
 * Core logic for automated booking dispatch and rejection cascades
 */

const MAX_CASCADE_ATTEMPTS = 5;

/**
 * Main Auto-Assignment Entry Point
 */
const assignBooking = async (bookingId) => {
    try {
        // 1. Get Booking details
        const bookingResult = await db.query(
            `SELECT b.*, t.id as tenant_id, br.vehicle_type 
             FROM bookings b
             JOIN tenants t ON b.tenant_id = t.id
             LEFT JOIN booking_requirements br ON b.id = br.booking_id
             WHERE b.id = $1`,
            [bookingId]
        );

        if (bookingResult.rows.length === 0) {
            throw new AppError('Booking not found', 404);
        }

        const booking = bookingResult.rows[0];

        // 2. Find eligible drivers
        const vehicleType = booking.vehicle_type || 'sedan';
        const eligibleDrivers = await driverScheduleService.getAvailableDrivers(
            booking.scheduled_pickup_time,
            vehicleType,
            booking.tenant_id
        );

        if (eligibleDrivers.length === 0) {
            return await handleNoDriversAvailable(booking);
        }

        // 3. Check for time conflicts (±60 min buffer)
        const nonConflictingDrivers = [];
        for (const driver of eligibleDrivers) {
            const hasConflict = await hasTimeConflict(
                driver.id,
                booking.scheduled_pickup_time,
                booking.estimated_duration_minutes || 60
            );
            if (!hasConflict) {
                nonConflictingDrivers.push(driver);
            }
        }

        if (nonConflictingDrivers.length === 0) {
            return await handleNoDriversAvailable(booking);
        }

        // 4. Select driver using Priority + Round-Robin
        const selectedDriver = await selectDriverRoundRobin(nonConflictingDrivers, booking.tenant_id);

        if (!selectedDriver) {
            return await handleNoDriversAvailable(booking);
        }

        // 5. Execute Assignment
        return await assignToDriver(booking, selectedDriver);

    } catch (error) {
        logger.error('Auto-assignment failed', { bookingId, error: error.message });
        throw error;
    }
};

/**
 * Check if driver has any overlapping bookings within buffer
 */
const hasTimeConflict = async (driverId, pickupDateTime, estimatedDuration) => {
    const result = await db.query(
        `SELECT COUNT(*) FROM bookings
         WHERE driver_id = $1
         AND status NOT IN ('completed', 'cancelled', 'no_show_confirmed')
         AND (
            -- New booking pickup is during an existing trip (with 60m buffer)
            (scheduled_pickup_time - INTERVAL '60 minutes' <= $2 
             AND scheduled_pickup_time + (interval '1 minute' * (estimated_duration_minutes + 60)) >= $2)
            OR
            -- Existing booking pickup is during the new trip
            ($2 - INTERVAL '60 minutes' <= scheduled_pickup_time 
             AND $2 + (interval '1 minute' * ($3 + 60)) >= scheduled_pickup_time)
         )`,
        [driverId, pickupDateTime, estimatedDuration]
    );

    return parseInt(result.rows[0].count) > 0;
};

/**
 * Priority-based Round-Robin selection
 */
const selectDriverRoundRobin = async (eligibleDrivers, tenantId) => {
    // 1. Get highest priority drivers first
    const minPriority = Math.min(...eligibleDrivers.map(d => d.priority_level));
    const topPriorityDrivers = eligibleDrivers.filter(d => d.priority_level === minPriority);

    if (topPriorityDrivers.length === 1) return topPriorityDrivers[0];

    // 2. Multi-driver same priority: Round Robin
    const rrResult = await db.query(
        'SELECT last_assigned_driver_id FROM assignment_round_robin WHERE tenant_id = $1',
        [tenantId]
    );

    const lastDriverId = rrResult.rows[0]?.last_assigned_driver_id;

    // Find index of last driver or start at 0
    let startIndex = topPriorityDrivers.findIndex(d => d.id === lastDriverId);
    let nextIndex = (startIndex + 1) % topPriorityDrivers.length;

    return topPriorityDrivers[nextIndex];
};

/**
 * Atomic assignment operation
 */
const assignToDriver = async (booking, driver) => {
    return await db.transaction(async (client) => {
        // Lock booking row to prevent race conditions
        const lock = await client.query('SELECT status FROM bookings WHERE id = $1 FOR UPDATE', [booking.id]);

        if (lock.rows[0].status !== 'pending' && booking.auto_assignment_attempts === 0) {
            throw new AppError('Booking is no longer pending', 400);
        }

        // Update Booking
        const updatedBooking = await client.query(
            `UPDATE bookings 
             SET driver_id = $1, 
                 status = 'assigned', 
                 assignment_method = 'auto',
                 assignment_failed_reason = NULL,
                 last_assignment_attempt = NOW(),
                 auto_assignment_attempts = auto_assignment_attempts + 1
             WHERE id = $2
             RETURNING *`,
            [driver.id, booking.id]
        );

        // Record Assignment Attempt
        const attempt = await client.query(
            `INSERT INTO assignment_attempts (booking_id, driver_id, assignment_method, status)
             VALUES ($1, $2, 'auto', 'pending')
             RETURNING id`,
            [booking.id, driver.id]
        );

        // Update Round Robin Tracker
        await client.query(
            `INSERT INTO assignment_round_robin (tenant_id, last_assigned_driver_id, last_assigned_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (tenant_id) DO UPDATE SET 
                last_assigned_driver_id = EXCLUDED.last_assigned_driver_id,
                last_assigned_at = EXCLUDED.last_assigned_at,
                assignment_count = assignment_round_robin.assignment_count + 1`,
            [booking.tenant_id, driver.id]
        );

        // Log Event (Pass client to prevent deadlock)
        await eventLogger.logDriverAssigned(booking.id, booking.tenant_id, driver.id, { type: 'system', id: 0 }, client);

        // Emit Socket Events
        const serverMod = require('../server');
        const io = serverMod.io;
        if (io) {
            try {
                io.broadcastAutoAssignment(driver.user_id, {
                    booking_id: booking.id,
                    booking_reference: booking.booking_reference,
                    pickup_address: booking.pickup_address,
                    pickup_time: booking.scheduled_pickup_time,
                    passenger_name: booking.passenger_name
                });

                io.broadcastAssignmentSuccess(booking.tenant_id, {
                    booking_id: booking.id,
                    booking_reference: booking.booking_reference,
                    driver_name: `${driver.first_name} ${driver.last_name}`,
                    driver_id: driver.id
                });
            } catch (socketErr) {
                logger.error('Socket emission failed', { error: socketErr.message });
            }
        }

        return updatedBooking.rows[0];
    });
};

/**
 * Handle Driver accepting the auto-assignment
 */
const handleDriverAcceptance = async (bookingId, driverId) => {
    return await db.transaction(async (client) => {
        const updated = await client.query(
            `UPDATE bookings SET status = 'accepted', accepted_at = NOW()
             WHERE id = $1 AND driver_id = $2 AND status = 'assigned'
             RETURNING *`,
            [bookingId, driverId]
        );

        if (updated.rows.length === 0) throw new AppError('Acceptance failed or already accepted', 400);

        await client.query(
            `UPDATE assignment_attempts SET status = 'accepted', responded_at = NOW()
             WHERE booking_id = $1 AND driver_id = $2 AND status = 'pending'`,
            [bookingId, driverId]
        );

        return updated.rows[0];
    });
};

/**
 * Handle Driver rejection with Cascade/Retry logic
 */
const handleDriverRejection = async (bookingId, driverId, rejectionReason) => {
    const bookingResult = await db.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
    const booking = bookingResult.rows[0];

    return await db.transaction(async (client) => {
        // 1. Mark attempt as rejected
        await client.query(
            `UPDATE assignment_attempts 
             SET status = 'rejected', rejection_reason = $1, responded_at = NOW(), is_current_assignment = false
             WHERE booking_id = $2 AND driver_id = $3 AND status = 'pending'`,
            [rejectionReason, bookingId, driverId]
        );

        // 2. Check cascade limit
        if (booking.auto_assignment_attempts >= MAX_CASCADE_ATTEMPTS) {
            await client.query(
                `UPDATE bookings 
                 SET assignment_method = 'auto_failed', 
                     assignment_failed_reason = 'Exceeded max rejections',
                     driver_id = NULL,
                     status = 'pending'
                 WHERE id = $1`,
                [bookingId]
            );

            // Notify Admin
            const io = require('../server').io;
            if (io) {
                io.broadcastAssignmentFailed(booking.tenant_id, {
                    booking_id: bookingId,
                    booking_reference: booking.booking_reference,
                    reason: 'Max rejections reached',
                    message: `Booking ${booking.booking_reference} rejected by ${MAX_CASCADE_ATTEMPTS} drivers.`
                });
            }
            return { cascade: false, reason: 'limit_reached' };
        }

        // 3. Reset for next attempt
        await client.query(
            `UPDATE bookings SET driver_id = NULL, status = 'pending' WHERE id = $1`,
            [bookingId]
        );

        // 4. Trigger next assignment (outside transaction but service will handle it)
        process.nextTick(() => assignBooking(bookingId).catch(err => logger.error('Next cascade attempt failed', err)));

        return { cascade: true };
    });
};

/**
 * Fallback when no drivers are found
 */
const handleNoDriversAvailable = async (booking) => {
    await db.query(
        `UPDATE bookings 
         SET assignment_method = 'auto_failed', 
             assignment_failed_reason = 'No available drivers found',
             last_assignment_attempt = NOW()
         WHERE id = $1`,
        [booking.id]
    );

    const io = require('../server').io;
    if (io) {
        io.broadcastAssignmentFailed(booking.tenant_id, {
            booking_id: booking.id,
            booking_reference: booking.booking_reference,
            reason: 'No available drivers',
            message: 'Manual intervention required'
        });
    }

    return null;
};

module.exports = {
    assignBooking,
    handleDriverAcceptance,
    handleDriverRejection
};
