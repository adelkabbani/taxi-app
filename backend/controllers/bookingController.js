const bookingService = require('../services/bookingService');
const db = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../config/logger');
const eventLogger = require('../services/eventLogger');

/**
 * Booking Controller
 * Handles HTTP requests and responses for booking operations
 */

/**
 * Get all bookings with filters
 */
const getAllBookings = async (req, res) => {
    const {
        status,
        driverId,
        passengerId,
        partnerId,
        from_date,
        to_date,
        search,
        page = 1,
        limit = 20
    } = req.query;

    const offset = (page - 1) * limit;

    let query = `
    SELECT b.*, 
           COALESCE(b.passenger_name, CONCAT_WS(' ', u_passenger.first_name, u_passenger.last_name)) as passenger_name,
           COALESCE(b.passenger_phone, u_passenger.phone) as passenger_phone,
           CONCAT_WS(' ', u_driver.first_name, u_driver.last_name) as driver_name,
           u_driver.phone as driver_phone,
           p.name as partner_name,
           v.license_plate,
           v.vehicle_type,
           t.name as company_name
    FROM bookings b
    LEFT JOIN users u_passenger ON b.passenger_id = u_passenger.id
    LEFT JOIN drivers d ON b.driver_id = d.id
    LEFT JOIN users u_driver ON d.user_id = u_driver.id
    LEFT JOIN partners p ON b.partner_id = p.id
    LEFT JOIN vehicles v ON b.vehicle_id = v.id
    LEFT JOIN tenants t ON b.tenant_id = t.id
    WHERE 1=1
  `;

    const params = [];
    let paramIndex = 1;

    // Filter by Tenant (if not Super Admin)
    // Super Admin has tenantId = null, so we skip this filter
    if (req.tenantId !== null && req.tenantId !== undefined) {
        query += ` AND b.tenant_id = $${paramIndex}`;
        params.push(req.tenantId);
        paramIndex++;
    }

    if (status) {
        if (typeof status === 'string' && status.includes(',')) {
            const statusArray = status.split(',').map(s => s.trim());
            query += ` AND b.status = ANY($${paramIndex}::booking_status[])`;
            params.push(statusArray);
            paramIndex++;

            // IRONCLAD SAFETY NET: when a whitelist is sent, ALWAYS exclude
            // needs_review_price unless it's the ONLY requested status.
            // Prevents any frontend bug from leaking quarantined tours.
            const onlyQuarantine = statusArray.length === 1 && statusArray[0] === 'needs_review_price';
            if (!onlyQuarantine) {
                query += ` AND b.status != 'needs_review_price'`;
            }
        } else {
            query += ` AND b.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
    }


    if (driverId) {
        query += ` AND b.driver_id = $${paramIndex}`;
        params.push(driverId);
        paramIndex++;
    }

    if (passengerId) {
        query += ` AND b.passenger_id = $${paramIndex}`;
        params.push(passengerId);
        paramIndex++;
    }

    if (partnerId) {
        query += ` AND b.partner_id = $${paramIndex}`;
        params.push(partnerId);
        paramIndex++;
    }

    // Date filters are bypassed if a specific search term is provided to ensure target results are always found
    if (from_date && !search) {
        query += ` AND b.scheduled_pickup_time >= $${paramIndex}`;
        params.push(from_date);
        paramIndex++;
    }

    if (to_date && !search) {
        query += ` AND b.scheduled_pickup_time <= $${paramIndex}`;
        params.push(to_date);
        paramIndex++;
    }

    if (search) {
        const searchTerm = `%${search}%`;
        query += ` AND (
            b.id::text ILIKE $${paramIndex} OR
            REPLACE(b.booking_reference::text, '-', '') ILIKE REPLACE($${paramIndex}, '-', '') OR
            b.external_reference ILIKE $${paramIndex} OR
            COALESCE(b.passenger_name, CONCAT_WS(' ', u_passenger.first_name, u_passenger.last_name)) ILIKE $${paramIndex} OR
            COALESCE(b.passenger_phone, u_passenger.phone) ILIKE $${paramIndex} OR
            CONCAT_WS(' ', u_driver.first_name, u_driver.last_name) ILIKE $${paramIndex} OR
            b.flight_number ILIKE $${paramIndex}
        )`;
        params.push(searchTerm);
        paramIndex++;
    }

    query += ` ORDER BY b.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);




    const result = await db.query(query, params);


    // Get total count
    let countQuery = `
        SELECT COUNT(*) 
        FROM bookings b
        LEFT JOIN users u_passenger ON b.passenger_id = u_passenger.id
        LEFT JOIN drivers d ON b.driver_id = d.id
        LEFT JOIN users u_driver ON d.user_id = u_driver.id
        WHERE 1=1
    `;
    const countParams = [];
    let cIndex = 1;

    if (req.tenantId !== null && req.tenantId !== undefined) {
        countQuery += ` AND b.tenant_id = $${cIndex}`;
        countParams.push(req.tenantId);
        cIndex++;
    }

    if (status) {
        if (typeof status === 'string' && status.includes(',')) {
            const statusArray = status.split(',').map(s => s.trim());
            countQuery += ` AND b.status = ANY($${cIndex}::booking_status[])`;
            countParams.push(statusArray);
        } else {
            countQuery += ` AND b.status = $${cIndex}`;
            countParams.push(status);
        }
        cIndex++;
    }

    if (driverId) {
        countQuery += ` AND b.driver_id = $${cIndex}`;
        countParams.push(driverId);
        cIndex++;
    }

    if (passengerId) {
        countQuery += ` AND b.passenger_id = $${cIndex}`;
        countParams.push(passengerId);
        cIndex++;
    }

    if (partnerId) {
        countQuery += ` AND b.partner_id = $${cIndex}`;
        countParams.push(partnerId);
        cIndex++;
    }

    if (from_date && !search) {
        countQuery += ` AND b.scheduled_pickup_time >= $${cIndex}`;
        countParams.push(from_date);
        cIndex++;
    }

    if (to_date && !search) {
        countQuery += ` AND b.scheduled_pickup_time <= $${cIndex}`;
        countParams.push(to_date);
        cIndex++;
    }

    if (search) {
        const searchTerm = `%${search}%`;
        countQuery += ` AND (
            b.id::text ILIKE $${cIndex} OR
            REPLACE(b.booking_reference::text, '-', '') ILIKE REPLACE($${cIndex}, '-', '') OR
            b.external_reference ILIKE $${cIndex} OR
            COALESCE(b.passenger_name, u_passenger.first_name || ' ' || u_passenger.last_name) ILIKE $${cIndex} OR
            COALESCE(b.passenger_phone, u_passenger.phone) ILIKE $${cIndex} OR
            (u_driver.first_name || ' ' || u_driver.last_name) ILIKE $${cIndex} OR
            b.flight_number ILIKE $${cIndex}
        )`;
        countParams.push(searchTerm);
        cIndex++;
    }

    const countResult = await db.query(countQuery, countParams);

    res.json({
        success: true,
        data: result.rows,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(countResult.rows[0].count)
        }
    });
};

/**
 * Get booking by ID
 */
const getBookingById = async (req, res) => {
    const { id } = req.params;

    let query = `
    SELECT b.*, 
        COALESCE(b.passenger_name, u_passenger.first_name || ' ' || u_passenger.last_name) as passenger_name,
        COALESCE(b.passenger_phone, u_passenger.phone) as passenger_phone,
        u_driver.first_name || ' ' || u_driver.last_name as driver_name,
        u_driver.phone as driver_phone,
        p.name as partner_name,
        v.license_plate,
        v.vehicle_type
     FROM bookings b
     LEFT JOIN users u_passenger ON b.passenger_id = u_passenger.id
     LEFT JOIN drivers d ON b.driver_id = d.id
     LEFT JOIN users u_driver ON d.user_id = u_driver.id
     LEFT JOIN partners p ON b.partner_id = p.id
     LEFT JOIN vehicles v ON b.vehicle_id = v.id
     WHERE b.id = $1
  `;

    const params = [id];

    if (req.user.role === 'driver') {
        // Drivers can only see bookings assigned to them (cross-tenant safe)
        query += ` AND d.user_id = $2`;
        params.push(req.user.id);
    } else if (req.tenantId) {
        // Admins are scoped to their tenant
        query += ` AND b.tenant_id = $2`;
        params.push(req.tenantId);
    }

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
        throw new AppError('Booking not found', 404);
    }

    res.json({
        success: true,
        data: result.rows[0]
    });
};

/**
 * Create new booking
 */
const createBooking = async (req, res) => {
    let tenantId = req.tenantId;

    // If Super Admin (no tenant context), default to the first available tenant
    // This ensures Auto-Assignment can work (it requires a tenant_id)
    if (!tenantId) {
        const tenantResult = await db.query('SELECT id FROM tenants ORDER BY id ASC LIMIT 1');
        if (tenantResult.rows.length > 0) {
            tenantId = tenantResult.rows[0].id;
        }
    }

    if (!tenantId) {
        throw new AppError('No active tenant found to assign booking to', 400);
    }

    const booking = await bookingService.createBooking(req.body, {
        id: req.user.id,
        type: req.user.role,
        tenantId: tenantId
    });

    // Broadcast to WebSocket clients
    const io = req.app.get('io');
    if (io && io.broadcastBookingCreated) {
        io.broadcastBookingCreated(booking);
    }

    res.status(201).json({
        success: true,
        data: booking
    });
};

/**
 * Assign driver to booking
 */
const assignDriver = async (req, res) => {
    const { id } = req.params;
    const { driverId } = req.body;

    const booking = await bookingService.assignDriver(
        parseInt(id),
        parseInt(driverId),
        { id: req.user.id, type: 'admin' }
    );

    // Broadcast to WebSocket
    const io = req.app.get('io');
    if (io && io.broadcastDriverAssigned) {
        io.broadcastDriverAssigned(booking.id, booking.driver_user_id, driverId);
    }

    res.json({
        success: true,
        data: booking
    });
};

/**
 * Driver accepts booking
 */
const acceptBooking = async (req, res) => {
    const { id } = req.params;

    // Get driver ID from user
    const driverResult = await db.query(
        'SELECT id FROM drivers WHERE user_id = $1',
        [req.user.id]
    );

    if (driverResult.rows.length === 0) {
        throw new AppError('Driver profile not found', 404);
    }

    const driverId = driverResult.rows[0].id;

    const booking = await bookingService.acceptBooking(parseInt(id), driverId);

    res.json({
        success: true,
        data: booking
    });
};

/**
 * Driver rejects booking
 */
const rejectBooking = async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;



    // Get driver ID
    const driverResult = await db.query(
        'SELECT id FROM drivers WHERE user_id = $1',
        [req.user.id]
    );

    if (driverResult.rows.length === 0) {
        throw new AppError('Driver profile not found', 404);
    }

    const driverId = driverResult.rows[0].id;


    // Verify this driver actually has this booking
    const bookingCheck = await db.query(
        'SELECT id, status, driver_id, tenant_id FROM bookings WHERE id = $1 AND driver_id = $2',
        [id, driverId]
    );



    if (bookingCheck.rows.length === 0) {
        // Extra info: check what's actually in the booking
        const bookingRaw = await db.query(
            'SELECT id, status, driver_id FROM bookings WHERE id = $1',
            [id]
        );

        throw new AppError(`Booking not found or not assigned to you. Booking driver_id=${bookingRaw.rows[0]?.driver_id}, your driverId=${driverId}`, 404);
    }



    const booking = bookingCheck.rows[0];

    // RULE B: Reset to 'pending' with driver_id cleared so it bounces back to the queue
    await db.query(
        `UPDATE bookings 
         SET status = 'pending',
             driver_id = NULL,
             vehicle_id = NULL,
             excluded_drivers = array_append(COALESCE(excluded_drivers, '{}'), $1::integer),
             admin_notes = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [driverId, `[DRIVER REJECTED] ${reason || 'Driver declined this tour'} - Returned to Queue`, id]
    );

    // Update assignment_logs (Phase 2 Audit)
    await db.query(
        `INSERT INTO assignment_logs (booking_id, driver_id, actor_id, event_type, reason)
         VALUES ($1, $2, $3, 'rejected', $4)`,
        [id, driverId, driverId, reason || 'Driver declined this tour']
    );

    // Log event for booking timeline
    await eventLogger.logDriverRejected(id, booking.tenant_id, driverId, reason || 'Driver declined this tour');



    // Update driver back to available
    await db.query(
        `UPDATE drivers SET availability = 'available' WHERE id = $1`,
        [driverId]
    );



    // Update driver metrics (RULE A: Increment rejected_bookings)
    const metricUpdate = await db.query(
        `UPDATE driver_metrics 
         SET rejected_bookings = rejected_bookings + 1,
             total_bookings = total_bookings + 1,
             acceptance_rate = (accepted_bookings::float / NULLIF(accepted_bookings + rejected_bookings + 1, 0)) * 100
         WHERE driver_id = $1
         RETURNING rejected_bookings`,
        [driverId]
    );





    // Broadcast to Admin Dashboard
    const io = req.app.get('io');
    if (io) {
        io.to('admins').emit('booking_rejected', {
            bookingId: id,
            driverId: driverId,
            reason: reason || 'Rejected by driver'
        });
    }

    res.json({
        success: true,
        message: 'Tour rejected. Booking returned to pending dispatch queue.'
    });
};

/**
 * Driver marks arrived
 */
const markArrived = async (req, res) => {
    const { id } = req.params;
    const { lat, lng, accuracy } = req.body;



    // Get driver ID
    const driverResult = await db.query(
        'SELECT id FROM drivers WHERE user_id = $1',
        [req.user.id]
    );

    if (driverResult.rows.length === 0) {
        throw new AppError('Driver profile not found', 404);
    }

    const driverId = driverResult.rows[0].id;

    const booking = await bookingService.markArrived(
        parseInt(id),
        driverId,
        { lat, lng, accuracy }
    );

    res.json({
        success: true,
        data: booking,
        message: 'Arrived at pickup location. Waiting timer started.'
    });
};

/**
 * Driver marks passenger as received (collected)
 */
const markReceived = async (req, res) => {
    const { id } = req.params;

    const driverResult = await db.query(
        'SELECT id FROM drivers WHERE user_id = $1',
        [req.user.id]
    );

    if (driverResult.rows.length === 0) {
        throw new AppError('Driver profile not found', 404);
    }

    const driverId = driverResult.rows[0].id;

    const booking = await bookingService.markReceived(parseInt(id), driverId);

    res.json({
        success: true,
        data: booking,
        message: 'Passenger collected. Proceed to destination.'
    });
};

/**
 * Start trip
 */
const startTrip = async (req, res) => {
    const { id } = req.params;

    const driverResult = await db.query(
        'SELECT id FROM drivers WHERE user_id = $1',
        [req.user.id]
    );

    if (driverResult.rows.length === 0) {
        throw new AppError('Driver profile not found', 404);
    }

    const driverId = driverResult.rows[0].id;

    const booking = await bookingService.startTrip(parseInt(id), driverId);

    res.json({
        success: true,
        data: booking
    });
};

/**
 * Complete trip
 */
const completeTrip = async (req, res) => {
    const { id } = req.params;
    const { fareFinal, driverNotes } = req.body;

    const driverResult = await db.query(
        'SELECT id FROM drivers WHERE user_id = $1',
        [req.user.id]
    );

    if (driverResult.rows.length === 0) {
        throw new AppError('Driver profile not found', 404);
    }

    const driverId = driverResult.rows[0].id;

    const booking = await bookingService.completeTrip(
        parseInt(id),
        driverId,
        { fareFinal, driverNotes }
    );

    res.json({
        success: true,
        data: booking
    });
};

/**
 * Cancel booking
 */
const cancelBooking = async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await db.query(
        `UPDATE bookings 
     SET status = 'cancelled', cancelled_at = NOW(), admin_notes = $1
     WHERE id = $2 AND tenant_id = $3
     RETURNING *`,
        [reason, id, req.tenantId]
    );

    if (result.rows.length === 0) {
        throw new AppError('Booking not found or cannot be cancelled', 404);
    }

    const booking = result.rows[0];

    // Free up driver if assigned
    if (booking.driver_id) {
        await db.query(
            `UPDATE drivers SET availability = 'available' WHERE id = $1`,
            [booking.driver_id]
        );
    }

    res.json({
        success: true,
        data: result.rows[0]
    });
};

/**
 * Request no-show
 */
const requestNoShow = async (req, res) => {
    const { id } = req.params;
    const { evidenceIds, notes } = req.body;

    const driverResult = await db.query(
        'SELECT id FROM drivers WHERE user_id = $1',
        [req.user.id]
    );

    if (driverResult.rows.length === 0) {
        throw new AppError('Driver profile not found', 404);
    }

    const driverId = driverResult.rows[0].id;

    const booking = await bookingService.requestNoShow(
        parseInt(id),
        driverId,
        evidenceIds,
        notes
    );

    // Broadcast alert to admins
    const io = req.app.get('io');
    if (io && io.broadcastNoShowAlert) {
        io.broadcastNoShowAlert(booking.id, driverId);
    }

    res.json({
        success: true,
        data: booking,
        message: 'No-show request submitted. Pending admin confirmation.'
    });
};

/**
 * Confirm no-show (admin)
 */
const confirmNoShow = async (req, res) => {
    const { id } = req.params;

    const booking = await bookingService.confirmNoShow(
        parseInt(id),
        req.user.id,
        req.tenantId
    );

    res.json({
        success: true,
        data: booking
    });
};

/**
 * Get booking timeline
 */
const getBookingTimeline = async (req, res) => {
    const { id } = req.params;

    const result = await db.query(
        `SELECT * FROM booking_timeline 
     WHERE booking_id = $1 
     ORDER BY created_at ASC`,
        [id]
    );

    res.json({
        success: true,
        data: result.rows
    });
};

/**
 * Get booking evidence
 */
const getBookingEvidence = async (req, res) => {
    const { id } = req.params;

    const result = await db.query(
        `SELECT * FROM proof_assets 
     WHERE booking_id = $1 
     ORDER BY captured_at ASC`,
        [id]
    );

    res.json({
        success: true,
        data: result.rows
    });
};

/**
 * Admin override booking status
 */
const adminOverride = async (req, res) => {
    const { id } = req.params;
    const { newStatus, reason } = req.body;

    // Get current booking
    const currentResult = await db.query(
        'SELECT * FROM bookings WHERE id = $1',
        [id]
    );

    if (currentResult.rows.length === 0) {
        throw new AppError('Booking not found', 404);
    }

    const oldStatus = currentResult.rows[0].status;

    // Bypass state machine validation by using admin override
    const result = await db.query(
        `UPDATE bookings 
     SET status = $1, admin_notes = $2
     WHERE id = $3
     RETURNING *`,
        [newStatus, reason, id]
    );

    // Log admin override
    await eventLogger.logAdminOverride(
        parseInt(id),
        req.tenantId,
        req.user.id,
        oldStatus,
        newStatus,
        reason
    );

    logger.warn('Admin override executed', {
        bookingId: id,
        adminId: req.user.id,
        oldStatus,
        newStatus,
        reason
    });

    res.json({
        success: true,
        data: result.rows[0],
        message: `Status overridden from ${oldStatus} to ${newStatus}`
    });
};

/**
 * Reset a booking to pending status (Admin only)
 * Clears driver, vehicle, and resets auto-assignment attempts.
 */
const resetBooking = async (req, res) => {
    const { id } = req.params;

    // 1. Get current status for logging
    const currentResult = await db.query(
        'SELECT status, tenant_id FROM bookings WHERE id = $1',
        [id]
    );

    if (currentResult.rows.length === 0) {
        throw new AppError('Booking not found', 404);
    }

    const oldStatus = currentResult.rows[0].status;
    const tenantId = currentResult.rows[0].tenant_id;

    // 2. Perform reset
    const result = await db.query(
        `UPDATE bookings 
         SET status = 'pending', 
             driver_id = NULL, 
             vehicle_id = NULL, 
             auto_assignment_attempts = 0,
             assignment_method = NULL,
             updated_at = NOW()
         WHERE id = $1 
         RETURNING *`,
        [id]
    );

    // 3. Log the reset (as an admin override)
    await eventLogger.logAdminOverride(
        parseInt(id),
        tenantId,
        req.user.id,
        oldStatus,
        'pending',
        'Manual reset to pending by dispatcher'
    );

    // 4. Broadcast update
    const io = req.app.get('io');
    if (io) {
        io.to('admins').emit('booking_updated', result.rows[0]);
        io.emit('booking_updated', result.rows[0]);
    }

    res.json({
        success: true,
        data: result.rows[0],
        message: 'Booking reset to pending successfully. AI can now attempt reassignment.'
    });
};

/**
 * Unassign driver from booking (Admin only)
 */
const unassignDriver = async (req, res) => {
    const { id } = req.params;

    const result = await db.query(
        `UPDATE bookings 
         SET driver_id = NULL, 
             vehicle_id = NULL, 
             status = 'pending', 
             updated_at = NOW()
         WHERE id = $1 
         RETURNING *`,
        [id]
    );

    if (result.rows.length === 0) {
        throw new AppError('Booking not found', 404);
    }

    // Broadcast update
    const io = req.app.get('io');
    if (io) {
        io.to('admins').emit('booking_unassigned', { bookingId: id });
        io.emit('booking_updated', result.rows[0]);
    }

    res.json({
        success: true,
        message: 'Driver unassigned successfully. Booking is now pending.'
    });
};

/**
 * Approve quarantined price — promote needs_review_price → pending (Admin only)
 */
const approvePrice = async (req, res) => {
    const { id } = req.params;

    const check = await db.query(
        'SELECT id, status FROM bookings WHERE id = $1',
        [id]
    );

    if (check.rows.length === 0) {
        throw new AppError('Booking not found', 404);
    }

    if (check.rows[0].status !== 'needs_review_price') {
        throw new AppError(
            `Cannot approve: status is '${check.rows[0].status}', expected 'needs_review_price'`,
            400
        );
    }

    await db.query(
        `UPDATE bookings
         SET status                   = 'pending',
             assignment_method        = 'auto',
             assignment_failed_reason = NULL,
             admin_notes              = 'Price approved by admin — promoted from quarantine',
             updated_at               = NOW()
         WHERE id = $1`,
        [id]
    );

    // Non-fatal audit log
    db.query(
        `INSERT INTO assignment_logs (booking_id, driver_id, event_type, reason)
         VALUES ($1, NULL, 'admin_action', 'Price approved — quarantine lifted')`,
        [id]
    ).catch(() => {});



    const io = req.app.get('io');
    if (io) io.to('admins').emit('bookings_updated', { bookingId: id, action: 'price_approved' });

    res.json({ success: true, message: `Booking #${id} approved — moved to Active Queue` });
};

/**
 * Manually reject a quarantined booking (Admin only)
 */
const rejectQuarantine = async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const check = await db.query(
        'SELECT id, status FROM bookings WHERE id = $1',
        [id]
    );

    if (check.rows.length === 0) {
        throw new AppError('Booking not found', 404);
    }

    const rejectionReason = reason || 'Manually rejected by Admin';

    await db.query(
        `UPDATE bookings
         SET status      = 'rejected',
             admin_notes = $1,
             updated_at  = NOW()
         WHERE id = $2`,
        [rejectionReason, id]
    );

    // Non-fatal audit log
    db.query(
        `INSERT INTO assignment_logs (booking_id, driver_id, event_type, reason)
         VALUES ($1, NULL, 'admin_action', $2)`,
        [id, rejectionReason]
    ).catch(() => {});



    const io = req.app.get('io');
    if (io) io.to('admins').emit('bookings_updated', { bookingId: id, action: 'quarantine_rejected' });

    res.json({ success: true, message: `Booking #${id} rejected` });
};

/**
 * Get active bookings for current driver
 */
const getDriverBookings = async (req, res) => {
    const driverResult = await db.query(
        'SELECT id FROM drivers WHERE user_id = $1',
        [req.user.id]
    );

    if (driverResult.rows.length === 0) {
        throw new AppError('Driver profile not found', 404);
    }

    const driverId = driverResult.rows[0].id;

    const bookings = await db.query(
        `SELECT b.*, 
                COALESCE(b.passenger_name, u_passenger.first_name || ' ' || u_passenger.last_name) as passenger_name,
                COALESCE(b.passenger_phone, u_passenger.phone) as passenger_phone
         FROM bookings b
         LEFT JOIN users u_passenger ON b.passenger_id = u_passenger.id
         WHERE b.driver_id = $1 
         AND b.status IN ('assigned', 'accepted', 'arrived', 'waiting_started', 'started')
         AND (b.scheduled_pickup_time::date >= CURRENT_DATE OR (b.status IN ('arrived', 'waiting_started', 'started') AND b.scheduled_pickup_time >= now() - interval '24 hours'))
         ORDER BY b.scheduled_pickup_time ASC`,
        [driverId]
    );

    res.json({
        success: true,
        data: bookings.rows
    });
};

/**
 * Get assignment logs for a booking
 */
const getAssignmentLogs = async (req, res) => {
    const { id } = req.params;

    const query = `
        SELECT al.*, 
               u_actor.first_name || ' ' || u_actor.last_name as actor_name,
               u_driver.first_name || ' ' || u_driver.last_name as driver_name
        FROM assignment_logs al
        LEFT JOIN drivers d_actor ON al.actor_id = d_actor.id
        LEFT JOIN users u_actor ON d_actor.user_id = u_actor.id
        LEFT JOIN drivers d_driver ON al.driver_id = d_driver.id
        LEFT JOIN users u_driver ON d_driver.user_id = u_driver.id
        WHERE al.booking_id = $1
        ORDER BY al.created_at ASC
    `;

    const result = await db.query(query, [id]);

    res.json({
        success: true,
        data: result.rows
    });
};

module.exports = {
    getAllBookings,
    getBookingById,
    createBooking,
    assignDriver,
    acceptBooking,
    rejectBooking,
    markArrived,
    markReceived,
    startTrip,
    completeTrip,
    cancelBooking,
    requestNoShow,
    confirmNoShow,
    getBookingTimeline,
    getBookingEvidence,
    adminOverride,
    resetBooking,
    unassignDriver,
    getDriverBookings,
    approvePrice,
    rejectQuarantine,
    getAssignmentLogs
};

