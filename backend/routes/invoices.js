const express = require('express');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { restrictTo } = require('../middleware/auth');
const db = require('../config/database');

const router = express.Router();

// All routes require auth (applied in server.js via protect middleware)

/**
 * @route   GET /api/invoices
 * @desc    List invoices for the tenant (with optional filters)
 * @access  Admin
 */
router.get('/', restrictTo('admin'), asyncHandler(async (req, res) => {
    const { status, partner_id, booking_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const tenantId = req.tenantId;

    const values = [];
    let paramIndex = 1;
    let where = '';

    if (tenantId) {
        where += ` AND i.tenant_id = $${paramIndex++}`;
        values.push(tenantId);
    }
    if (status) {
        where += ` AND i.status = $${paramIndex++}`;
        values.push(status);
    }
    if (partner_id) {
        where += ` AND i.partner_id = $${paramIndex++}`;
        values.push(parseInt(partner_id));
    }
    if (booking_id) {
        where += ` AND i.booking_id = $${paramIndex++}`;
        values.push(parseInt(booking_id));
    }

    const countResult = await db.query(
        `SELECT COUNT(*) FROM invoices i WHERE 1=1 ${where}`,
        values
    );

    const result = await db.query(
        `SELECT
            i.*,
            b.pickup_address, b.dropoff_address, b.pickup_time,
            p.name AS partner_name
         FROM invoices i
         LEFT JOIN bookings b ON i.booking_id = b.id
         LEFT JOIN partners p ON i.partner_id = p.id
         WHERE 1=1 ${where}
         ORDER BY i.created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...values, parseInt(limit), offset]
    );

    res.json({
        success: true,
        data: result.rows,
        pagination: {
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        }
    });
}));

/**
 * @route   GET /api/invoices/:id
 * @desc    Get a single invoice
 * @access  Admin
 */
router.get('/:id', restrictTo('admin'), asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await db.query(
        `SELECT
            i.*,
            b.pickup_address, b.dropoff_address, b.pickup_time, b.passenger_name,
            p.name AS partner_name
         FROM invoices i
         LEFT JOIN bookings b ON i.booking_id = b.id
         LEFT JOIN partners p ON i.partner_id = p.id
         WHERE i.id = $1`,
        [id]
    );

    if (result.rows.length === 0) {
        throw new AppError('Invoice not found', 404);
    }

    const invoice = result.rows[0];

    // Tenant isolation
    if (req.tenantId && invoice.tenant_id !== req.tenantId) {
        throw new AppError('Invoice not found', 404);
    }

    res.json({ success: true, data: invoice });
}));

/**
 * @route   POST /api/invoices
 * @desc    Create an invoice for a completed booking
 * @access  Admin
 */
router.post('/', restrictTo('admin'), asyncHandler(async (req, res) => {
    const {
        booking_id,
        fare_final,
        waiting_fee = 0,
        no_show_fee = 0,
        commission = 0,
        payment_method
    } = req.body;

    if (!booking_id || fare_final === undefined) {
        throw new AppError('booking_id and fare_final are required', 400);
    }

    // Fetch the booking
    const bookingResult = await db.query(
        'SELECT * FROM bookings WHERE id = $1',
        [parseInt(booking_id)]
    );

    if (bookingResult.rows.length === 0) {
        throw new AppError('Booking not found', 404);
    }

    const booking = bookingResult.rows[0];

    if (req.tenantId && booking.tenant_id !== req.tenantId) {
        throw new AppError('Booking not found', 404);
    }

    // Check for existing invoice
    const existing = await db.query(
        'SELECT id FROM invoices WHERE booking_id = $1',
        [parseInt(booking_id)]
    );
    if (existing.rows.length > 0) {
        throw new AppError('An invoice already exists for this booking', 409);
    }

    const total_amount = parseFloat(fare_final) + parseFloat(waiting_fee) + parseFloat(no_show_fee);
    const invoice_number = `INV-${Date.now()}-${booking_id}`;

    const result = await db.query(
        `INSERT INTO invoices
            (tenant_id, booking_id, partner_id, invoice_number,
             fare_final, waiting_fee, no_show_fee, commission,
             total_amount, payment_method, status, issued_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', NOW())
         RETURNING *`,
        [
            booking.tenant_id,
            booking_id,
            booking.partner_id || null,
            invoice_number,
            fare_final,
            waiting_fee,
            no_show_fee,
            commission,
            total_amount,
            payment_method || booking.payment_method
        ]
    );

    // Update booking invoice_status
    await db.query(
        "UPDATE bookings SET invoice_status = 'issued' WHERE id = $1",
        [parseInt(booking_id)]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
}));

/**
 * @route   PATCH /api/invoices/:id/status
 * @desc    Mark invoice as paid or update status
 * @access  Admin
 */
router.patch('/:id/status', restrictTo('admin'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'issued', 'paid'];
    if (!validStatuses.includes(status)) {
        throw new AppError(`Status must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const paidAt = status === 'paid' ? 'NOW()' : 'NULL';

    const result = await db.query(
        `UPDATE invoices
         SET status = $1, paid_at = ${paidAt}
         WHERE id = $2
         RETURNING *`,
        [status, id]
    );

    if (result.rows.length === 0) {
        throw new AppError('Invoice not found', 404);
    }

    const invoice = result.rows[0];

    if (req.tenantId && invoice.tenant_id !== req.tenantId) {
        throw new AppError('Invoice not found', 404);
    }

    // Sync booking invoice_status
    if (status === 'paid') {
        await db.query(
            "UPDATE bookings SET invoice_status = 'paid' WHERE id = $1",
            [invoice.booking_id]
        );
    }

    res.json({ success: true, data: invoice });
}));

/**
 * @route   DELETE /api/invoices/:id
 * @desc    Delete an unpaid invoice
 * @access  Admin
 */
router.delete('/:id', restrictTo('admin'), asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await db.query('SELECT * FROM invoices WHERE id = $1', [id]);

    if (result.rows.length === 0) {
        throw new AppError('Invoice not found', 404);
    }

    const invoice = result.rows[0];

    if (req.tenantId && invoice.tenant_id !== req.tenantId) {
        throw new AppError('Invoice not found', 404);
    }

    if (invoice.status === 'paid') {
        throw new AppError('Cannot delete a paid invoice', 400);
    }

    await db.query('DELETE FROM invoices WHERE id = $1', [id]);

    // Reset booking invoice_status
    await db.query(
        "UPDATE bookings SET invoice_status = 'not_required' WHERE id = $1",
        [invoice.booking_id]
    );

    res.json({ success: true, message: 'Invoice deleted' });
}));

module.exports = router;
