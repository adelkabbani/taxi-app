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
        // 0. ABSOLUTE KILL-SWITCH (12-Hour AI Leash)
        // Physically block any assignment scheduled more than 12 hours from now.
        const check = await db.query('SELECT scheduled_pickup_time, booking_reference FROM bookings WHERE id = $1', [bookingId]);
        if (check.rows.length > 0) {
            const booking = check.rows[0];
            if (new Date(booking.scheduled_pickup_time) > new Date(Date.now() + 12 * 60 * 60 * 1000)) {
                logger.info(`🚨 [EXIT: KILL-SWITCH] Skipping ${booking.booking_reference}. Beyond 12h horizon.`);
                return null;
            }
        }

        // 1. Get Booking details with a row-level lock

        // 1. Get Booking details with a row-level lock to prevent concurrent dispatch workers
        //    from racing on the same booking. SKIP LOCKED causes workers to immediately drop
        //    attempts on rows another transaction already holds — no deadlock, no hang.
        const bookingResult = await db.transaction(async (client) => {
            const res = await client.query(
                `SELECT b.*, t.id as tenant_id, br.vehicle_type 
                 FROM bookings b
                 LEFT JOIN tenants t ON b.tenant_id = t.id
                 LEFT JOIN booking_requirements br ON b.id = br.booking_id
                 WHERE b.id = $1 AND b.status = 'pending'
                 FOR UPDATE OF b SKIP LOCKED`,
                [bookingId]
            );

            if (res.rows.length > 0) {
                const booking = res.rows[0];
                const pickupTime = new Date(booking.scheduled_pickup_time);
                const horizonLimit = new Date(Date.now() + 12 * 60 * 60 * 1000);

                if (pickupTime > horizonLimit) {
                    logger.info(`🚨 [HORIZON GUARD] Blocking assignment for ${booking.booking_reference}. Beyond 12h limit.`);
                    return { skipped: true, reason: 'outside_horizon' };
                }
            }
            return res;
        });

        if (!bookingResult || bookingResult.skipped || bookingResult.rows.length === 0) {
            return null;
        }

        const booking = bookingResult.rows[0];


        // 2. Find eligible drivers (All Active Tiers 1-5 with flexible mapping)
        const vehicleMapping = {
            'economy_sedan': ['SEDAN', 'LUXURY'],
            'premium_sedan': ['LUXURY'],
            'minivan': ['VAN', 'MINIBUS']
        };
        const allowedTypes = vehicleMapping[booking.vehicle_type] || [booking.vehicle_type];

        const eligibleDriversQuery = `
            SELECT d.id, d.user_id, u.tenant_id, u.first_name, u.last_name, 
                   COALESCE(t.dispatch_priority, 3) as fleet_priority, v.vehicle_type
            FROM drivers d
            JOIN users u ON d.user_id = u.id
            LEFT JOIN tenants t ON u.tenant_id = t.id
            LEFT JOIN vehicles v ON d.vehicle_id = v.id
            WHERE u.status = 'active'
              AND (v.vehicle_type = ANY($2) OR $2 IS NULL)
              AND (t.dispatch_priority IN (1, 2, 3, 4, 5) OR t.dispatch_priority IS NULL)
              AND d.id NOT IN (
                SELECT unnest(COALESCE(excluded_drivers, '{}'::integer[])) 
                FROM bookings 
                WHERE id = $1
              )
            ORDER BY fleet_priority ASC, d.priority_level ASC, d.id ASC
        `;
        const eligibleDrivers = (await db.query(eligibleDriversQuery, [bookingId, allowedTypes])).rows;

        if (eligibleDrivers.length === 0) {

            await handleNoDriversAvailable(booking);
            return false;
        }

        // 3. Conflict Guard: Ensure no driver is double-booked
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

            await handleNoDriversAvailable(booking);
            return false;
        }

        // 4. Select Driver (Pure Round Robin)
        const selectedDriver = await selectDriverRoundRobin(nonConflictingDrivers, booking.tenant_id);

        if (!selectedDriver) {
            await handleNoDriversAvailable(booking);
            return false;
        }

        // 5. Execute Assignment
        return await assignToDriver(booking, selectedDriver);

    } catch (error) {
        console.error('CRITICAL ASSIGNMENT ERROR in assignBooking:', error.message, error.stack);
        logger.error('Auto-assignment failed', { bookingId, error: error.message });
        throw error;
    }
};

/**
 * Check if driver has any overlapping bookings within buffer
 */
const hasTimeConflict = async (driverId, pickupDateTime, estimatedDuration = 60) => {
    const result = await db.query(
        `SELECT COUNT(*) FROM bookings
         WHERE driver_id = $1
         AND status NOT IN ('completed', 'cancelled', 'no_show_confirmed', 'expired')
         AND (
            -- New booking pickup is during an existing trip (with 75m buffer)
            (scheduled_pickup_time - INTERVAL '75 minutes' <= $2 
             AND scheduled_pickup_time + (interval '1 minute' * (estimated_duration_minutes + 75)) >= $2)
            OR
            -- Existing booking pickup is during the new trip
            ($2 - INTERVAL '75 minutes' <= scheduled_pickup_time 
             AND $2 + (interval '1 minute' * ($3 + 75)) >= scheduled_pickup_time)
         )`,
        [driverId, pickupDateTime, estimatedDuration]
    );

    return parseInt(result.rows[0].count) > 0;
};

/**
 * Priority-Aware Round-Robin selection
 */
const selectDriverRoundRobin = async (eligibleDrivers, tenantId) => {
    // DUMB LOGIC: Pure Round Robin across the provided list (No priority tiers)
    const rrKey = tenantId || 0;
    
    const rrResult = await db.query(
        'SELECT last_assigned_driver_id FROM assignment_round_robin WHERE tenant_id = $1',
        [rrKey]
    );

    const lastDriverId = rrResult.rows[0]?.last_assigned_driver_id;

    // Find index of last driver or start at 0
    let startIndex = eligibleDrivers.findIndex(d => d.id === lastDriverId);
    let nextIndex = (startIndex + 1) % eligibleDrivers.length;

    return eligibleDrivers[nextIndex];
};

/**
 * Atomic assignment operation
 */
/**
 * Atomic assignment operation
 */
const assignToDriver = async (booking, driver) => {
    let result = null;
    try {
        result = await db.transaction(async (client) => {
            // Lock booking row to prevent race conditions
            const lock = await client.query('SELECT status FROM bookings WHERE id = $1 FOR UPDATE SKIP LOCKED', [booking.id]);

                return null;

                return null;

            // 1. EXECUTE AND COMMIT BOOKING UPDATE (Safety First)
            const updateSql = `
                UPDATE bookings 
                SET driver_id = $1, 
                    status = 'assigned', 
                    assignment_method = 'auto',
                    tenant_id = COALESCE(tenant_id, $3),
                    assignment_failed_reason = NULL,
                    last_assignment_attempt = NOW(),
                    auto_assignment_attempts = auto_assignment_attempts + 1
                WHERE id = $2
                RETURNING *`;
            const updateParams = [driver.id, booking.id, driver.tenant_id];

            const updatedBooking = await client.query(updateSql, updateParams);

            if (updatedBooking.rowCount === 0) {
                return null;
            }

            return { 
                success: true, 
                finalBooking: updatedBooking.rows[0],
                finalTenantId: updatedBooking.rows[0].tenant_id // Matches COALESCE result
            };
        });
    } catch (dbError) {
        console.error('CRITICAL DB UPDATE ERROR in assignToDriver:', dbError.message, dbError.stack);
        return false;
    }

    // 2. POST-ASSIGNMENT (OUTSIDE MAIN TRANSACTION - PERSISTENT SUCCESS)
    if (result && result.success) {
        const { finalBooking, finalTenantId } = result;
        const rrKey = finalTenantId || 0; // Use 0 for Global Queue

        try {


            // A. Record Assignment Attempt
            await db.query(
                `INSERT INTO assignment_attempts (booking_id, driver_id, assignment_method, status)
                 VALUES ($1, $2, 'auto', 'pending')`,
                [booking.id, driver.id]
            );

            // A2. Log into assignment_logs (Phase 2 Audit)
            await db.query(
                `INSERT INTO assignment_logs (booking_id, driver_id, actor_id, event_type, reason, details)
                 VALUES ($1, $2, $3, 'assigned', 'AI Auto-Assignment', $4)`,
                [booking.id, driver.id, 0, JSON.stringify({ 
                    attempt: booking.auto_assignment_attempts + 1,
                    fleet_priority: driver.fleet_priority 
                })]
            );

            // B. Update Round Robin Tracker
            await db.query(
                `INSERT INTO assignment_round_robin (tenant_id, last_assigned_driver_id, last_assigned_at)
                 VALUES ($1, $2, NOW())
                 ON CONFLICT (tenant_id) DO UPDATE SET 
                    last_assigned_driver_id = EXCLUDED.last_assigned_driver_id,
                    last_assigned_at = EXCLUDED.last_assigned_at,
                    assignment_count = assignment_round_robin.assignment_count + 1`,
                [rrKey, driver.id]
            ).catch(rrError => {
                console.error('[POST-ASSIGN ERROR] Round Robin failed:', rrError.message);
            });

            // C. Log Event
            await eventLogger.logDriverAssigned(booking.id, finalTenantId, driver.id, { type: 'system', id: 0 });

            // D. Emit Socket Events
            const serverMod = require('../server');
            const io = serverMod.io;
            if (io) {
                if (io.broadcastDriverAssigned) {
                    io.broadcastDriverAssigned(booking.id, driver.user_id, driver.id);
                }

                io.broadcastAssignmentSuccess(finalTenantId, {
                    booking_id: booking.id,
                    booking_reference: booking.booking_reference,
                    driver_name: `${driver.first_name} ${driver.last_name}`,
                    driver_id: driver.id
                });
            }
        } catch (postAssignError) {
            console.error(`[POST-ASSIGN ERROR] Non-critical failure for ${booking.booking_reference}:`, postAssignError.message, postAssignError.stack);
            // DO NOT return false here - the ride IS already assigned in the DB!
        }
        return true;
    }

    return false;
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
        // 1. Mark attempt as rejected in the assignment_attempts table (for history)
        await client.query(
            `UPDATE assignment_attempts 
             SET status = 'rejected', rejection_reason = $1, responded_at = NOW(), is_current_assignment = false
             WHERE booking_id = $2 AND driver_id = $3 AND status = 'pending'`,
            [rejectionReason, bookingId, driverId]
        );

        // 1b. Increment rejected_bookings in driver_metrics (RULE A)
        const metricUpdate = await client.query(
            `UPDATE driver_metrics 
             SET rejected_bookings = rejected_bookings + 1,
                 total_bookings = total_bookings + 1,
                 acceptance_rate = (accepted_bookings::float / NULLIF(accepted_bookings + rejected_bookings + 1, 0)) * 100
             WHERE driver_id = $1
             RETURNING rejected_bookings`,
            [driverId]
        );


        // 2. Add to assignment_logs for the Dispatch Console audit trail
        await client.query(
            `INSERT INTO assignment_logs (booking_id, driver_id, actor_id, event_type, reason, details)
             VALUES ($1, $2, $3, 'rejected', 'Driver Rejected - Returned to Queue', $4)`,
            [bookingId, driverId, driverId, JSON.stringify({ 
                reason: rejectionReason,
                auto_attempts: booking.auto_assignment_attempts + 1 
            })]
        );

        // 3. Log event for booking timeline
        await eventLogger.logDriverRejected(bookingId, booking.tenant_id, driverId, rejectionReason, client);

        // 4. RESET BOOKING: status -> pending, driver -> NULL, add to excluded_drivers (Bounce-Back Loop)
        await client.query(
            `UPDATE bookings 
             SET status = 'pending', 
                 driver_id = NULL,
                 excluded_drivers = array_append(COALESCE(excluded_drivers, '{}'::integer[]), $1),
                 assignment_failed_reason = NULL,
                 updated_at = NOW()
             WHERE id = $2`,
            [driverId, bookingId]
        );

        // 4. Check if we should notify admin about max rejections (optional but good for tracking)
        // 4. Check if we should respond with terminal rejection
        if (booking.auto_assignment_attempts + 1 >= MAX_CASCADE_ATTEMPTS) {
            await client.query(
                `UPDATE bookings 
                 SET assignment_method = 'auto_failed', 
                     assignment_failed_reason = 'Exceeded max rejections (returned to manual queue)',
                     driver_id = NULL,
                     status = 'pending',
                     updated_at = NOW()
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

        return { cascade: true, rejected: true };
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
    handleDriverRejection,
    hasTimeConflict
};
