const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { restrictTo } = require('../middleware/auth');

/**
 * @route   GET /api/partners
 * @desc    Get all partners
 * @access  Private (admin)
 */
router.get('/', asyncHandler(async (req, res) => {
    const result = await db.query(
        `SELECT id, name, contact_email, contact_phone, timezone, is_active, created_at
         FROM partners 
         WHERE tenant_id = $1 AND is_active = true
         ORDER BY name ASC`,
        [req.tenantId]
    );

    res.json({
        success: true,
        data: result.rows
    });
}));

/**
 * @route   GET /api/partners/:id
 * @desc    Get partner by ID
 * @access  Private (admin)
 */
router.get('/:id', restrictTo('admin'), asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await db.query(
        `SELECT p.*, ppr.*
         FROM partners p
         LEFT JOIN partner_pricing_rules ppr ON p.id = ppr.partner_id
         WHERE p.id = $1 AND p.tenant_id = $2`,
        [id, req.tenantId]
    );

    if (result.rows.length === 0) {
        throw new AppError('Partner not found', 404);
    }

    res.json({
        success: true,
        data: result.rows[0]
    });
}));

/**
 * @route   POST /api/partners
 * @desc    Create new partner
 * @access  Private (admin)
 */
router.post('/', restrictTo('admin'), asyncHandler(async (req, res) => {
    const { name, contactEmail, contactPhone, timezone, commissionPercentage } = req.body;

    // Generate API key for partner
    const apiKey = `pk_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;

    const result = await db.query(
        `INSERT INTO partners (tenant_id, name, contact_email, contact_phone, timezone, api_key)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [req.tenantId, name, contactEmail, contactPhone, timezone || 'Europe/Berlin', apiKey]
    );

    const partner = result.rows[0];

    // Create pricing rules if provided
    if (commissionPercentage !== undefined || req.body.minFareThreshold !== undefined) {
        await db.query(
            `INSERT INTO partner_pricing_rules (partner_id, commission_percentage, min_fare_threshold)
             VALUES ($1, $2, $3)`,
            [partner.id, commissionPercentage || 0, req.body.minFareThreshold || 0]
        );
    }

    res.status(201).json({
        success: true,
        data: partner
    });
}));

/**
 * @route   PATCH /api/partners/:id
 * @desc    Update partner
 * @access  Private (admin)
 */
router.patch('/:id', restrictTo('admin'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, contactEmail, contactPhone, timezone, isActive } = req.body;

    const result = await db.query(
        `UPDATE partners 
         SET name = COALESCE($1, name),
             contact_email = COALESCE($2, contact_email),
             contact_phone = COALESCE($3, contact_phone),
             timezone = COALESCE($4, timezone),
             is_active = COALESCE($5, is_active)
         WHERE id = $6 AND tenant_id = $7
         RETURNING *`,
        [name, contactEmail, contactPhone, timezone, isActive, id, req.tenantId]
    );

    if (result.rows.length === 0) {
        throw new AppError('Partner not found', 404);
    }

    // Update pricing rules if threshold provided
    if (req.body.minFareThreshold !== undefined) {
        await db.query(
            `UPDATE partner_pricing_rules 
             SET min_fare_threshold = $1 
             WHERE partner_id = $2`,
            [req.body.minFareThreshold, id]
        );
    }

    res.json({
        success: true,
        data: result.rows[0]
    });
}));

/**
 * @route   GET /api/partners/:id/bookings
 * @desc    Get all bookings for a partner
 * @access  Private (admin)
 */
router.get('/:id/bookings', restrictTo('admin'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { from, to, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
        SELECT b.*, 
               u.first_name || ' ' || u.last_name as passenger_name
        FROM bookings b
        LEFT JOIN users u ON b.passenger_id = u.id
        WHERE b.partner_id = $1 AND b.tenant_id = $2
    `;
    const params = [id, req.tenantId];
    let paramIndex = 3;

    if (status) {
        query += ` AND b.status = $${paramIndex}`;
        params.push(status);
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

    query += ` ORDER BY b.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({
        success: true,
        data: result.rows
    });
}));

/**
 * @route   GET /api/partners/:id/settlements
 * @desc    Get partner settlements
 * @access  Private (admin)
 */
router.get('/:id/settlements', restrictTo('admin'), asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await db.query(
        `SELECT * FROM partner_settlements
         WHERE partner_id = $1
         ORDER BY period_end DESC`,
        [id]
    );

    res.json({
        success: true,
        data: result.rows
    });
}));

module.exports = router;
