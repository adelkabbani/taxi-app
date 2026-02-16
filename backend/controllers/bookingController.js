const bookingService = require('../services/bookingService');
const db = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

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
        from,
        to,
        search,
        page = 1,
        limit = 20
    } = req.query;

    const offset = (page - 1) * limit;

    let query = `
    SELECT b.*, 
           COALESCE(b.passenger_name, u_passenger.first_name || ' ' || u_passenger.last_name) as passenger_name,
           COALESCE(b.passenger_phone, u_passenger.phone) as passenger_phone,
           u_driver.first_name || ' ' || u_driver.last_name as driver_name,
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
    if (req.tenantId) {
        query += ` AND b.tenant_id = $${paramIndex}`;
        params.push(req.tenantId);
        paramIndex++;
    }

    if (status) {
        query += ` AND b.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
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

    if (from) {
        query += ` AND b.created_at >= $${paramIndex}`;
        params.push(from);
        paramIndex++;
    }

    if (to) {
        query += ` AND b.created_at <= $${paramIndex}`;
        params.push(to);
        paramIndex++;
    }

    if (search) {
        const searchTerm = `%${search}%`;
        query += ` AND (
            b.id::text ILIKE $${paramIndex} OR
            b.reference::text ILIKE $${paramIndex} OR
            b.external_reference ILIKE $${paramIndex} OR
            COALESCE(b.passenger_name, u_passenger.first_name || ' ' || u_passenger.last_name) ILIKE $${paramIndex} OR
            COALESCE(b.passenger_phone, u_passenger.phone) ILIKE $${paramIndex} OR
            (u_driver.first_name || ' ' || u_driver.last_name) ILIKE $${paramIndex} OR
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

    if (req.tenantId) {
        countQuery += ` AND b.tenant_id = $${cIndex}`;
        countParams.push(req.tenantId);
        cIndex++;
    }

    if (status) {
        countQuery += ` AND b.status = $${cIndex}`;
        countParams.push(status);
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

    if (from) {
        countQuery += ` AND b.created_at >= $${cIndex}`;
        countParams.push(from);
        cIndex++;
    }

    if (to) {
        countQuery += ` AND b.created_at <= $${cIndex}`;
        countParams.push(to);
        cIndex++;
    }

    if (search) {
        const searchTerm = `%${search}%`;
        countQuery += ` AND (
            b.id::text ILIKE $${cIndex} OR
            b.reference::text ILIKE $${cIndex} OR
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

    if (req.tenantId) {
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
        io.broadcastDriverAssigned(booking.id, driverId);
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

    // Update booking back to pending
    await db.query(
        `UPDATE bookings SET status = 'pending', driver_id = NULL, vehicle_id = NULL
     WHERE id = $1 AND driver_id = $2`,
        [id, driverId]
    );

    // Update driver back to available
    await db.query(
        `UPDATE drivers SET availability = 'available' WHERE id = $1`,
        [driverId]
    );

    // Update driver metrics
    await db.query(
        `UPDATE driver_metrics 
     SET rejected_bookings = rejected_bookings + 1,
         total_bookings = total_bookings + 1,
         acceptance_rate = (accepted_bookings::float / NULLIF(total_bookings, 0)) * 100
     WHERE driver_id = $1`,
        [driverId]
    );

    res.json({
        success: true,
        message: 'Booking rejected and returned to pending'
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
    const eventLogger = require('../services/eventLogger');
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

module.exports = {
    getAllBookings,
    getBookingById,
    createBooking,
    assignDriver,
    acceptBooking,
    rejectBooking,
    markArrived,
    startTrip,
    completeTrip,
    cancelBooking,
    requestNoShow,
    confirmNoShow,
    getBookingTimeline,
    getBookingEvidence,
    adminOverride
};
