const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const bcrypt = require('bcrypt');
const { protect, restrictTo } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

console.log('TENANTS ROUTE FILE LOADED');
const router = express.Router();

/**
 * @route   POST /api/tenants
 * @desc    Create a new tenant with a fleet manager
 * @access  Private (Admin only)
 */
router.post('/',
    protect,
    restrictTo('admin'),
    [
        body('name').notEmpty().withMessage('Company name is required'),
        body('slug').notEmpty().withMessage('Slug is required'),
        body('adminFirstName').notEmpty(),
        body('adminLastName').notEmpty(),
        body('adminEmail').isEmail(),
        body('adminPhone').notEmpty(),
        body('adminPassword').isLength({ min: 6 })
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) throw new AppError('Validation failed', 400);

        const { name, slug, adminFirstName, adminLastName, adminEmail, adminPhone, adminPassword } = req.body;

        try {
            const result = await db.transaction(async (client) => {
                // 1. Create Tenant
                const tenantRes = await client.query(
                    `INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id`,
                    [name, slug]
                );
                const tenantId = tenantRes.rows[0].id;

                // 2. Create Fleet Manager User
                const passwordHash = await bcrypt.hash(adminPassword, 10);
                const userRes = await client.query(
                    `INSERT INTO users (tenant_id, role, email, phone, password_hash, first_name, last_name)
                     VALUES ($1, 'fleet_manager', $2, $3, $4, $5, $6)
                     RETURNING id`,
                    [tenantId, adminEmail, adminPhone, passwordHash, adminFirstName, adminLastName]
                );

                return {
                    tenantId,
                    fleetManagerId: userRes.rows[0].id
                };
            });

            res.status(201).json({
                success: true,
                data: result,
                message: 'Company and Fleet Manager created successfully'
            });
        } catch (error) {
            if (error.code === '23505') {
                throw new AppError('Slug or Email already exists', 400);
            }
            throw error;
        }
    })
);

/**
 * @route   GET /api/tenants
 * @desc    Get all tenants (Super Admin only)
 * @access  Private (Admin only)
 */
router.get('/',
    protect,
    restrictTo('admin'),
    asyncHandler(async (req, res) => {
        const result = await db.query('SELECT * FROM tenants ORDER BY created_at DESC');
        res.json({
            success: true,
            data: result.rows
        });
    })
);

/**
 * @route   GET /api/tenants/current/settings
 */
router.get('/current/settings',
    protect,
    asyncHandler(async (req, res) => {
        if (!req.tenantId) throw new AppError('No tenant context', 400);

        const result = await db.query(
            'SELECT id, name, stop_sell, auto_assign_min_fare FROM tenants WHERE id = $1',
            [req.tenantId]
        );

        if (result.rows.length === 0) {
            throw new AppError('Tenant not found', 404);
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    })
);

/**
 * @route   PATCH /api/tenants/current/settings
 */
router.patch('/current/settings',
    protect,
    restrictTo('admin', 'fleet_manager'),
    [
        body('stop_sell').optional().isBoolean(),
        body('autoAssignMinFare').optional().isNumeric()
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new AppError('Validation failed', 400);
        }

        const { stop_sell, autoAssignMinFare } = req.body;

        if (stop_sell === undefined && autoAssignMinFare === undefined) {
            throw new AppError('No settings to update', 400);
        }

        const updates = [];
        const params = [];
        let pIndex = 1;

        if (stop_sell !== undefined) {
            updates.push(`stop_sell = $${pIndex++}`);
            params.push(stop_sell);
        }

        if (autoAssignMinFare !== undefined) {
            updates.push(`auto_assign_min_fare = $${pIndex++}`);
            params.push(autoAssignMinFare);
        }

        params.push(req.tenantId);
        const query = `
            UPDATE tenants 
            SET ${updates.join(', ')} 
            WHERE id = $${pIndex} 
            RETURNING id, name, stop_sell, auto_assign_min_fare
        `;

        const result = await db.query(query, params);

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Settings updated successfully'
        });
    })
);

/**
 * @route   PATCH /api/tenants/:id/priority
 * @desc    Update tenant priority (1-5)
 * @access  Private (Admin only)
 */
router.patch('/:id/priority',
    protect,
    restrictTo('admin'),
    [
        body('priority').isInt({ min: 1, max: 5 }).withMessage('Priority must be between 1 and 5')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new AppError('Priority must be between 1 and 5', 400);
        }

        const { id } = req.params;
        const { priority } = req.body;

        const result = await db.query(
            'UPDATE tenants SET priority = $1 WHERE id = $2 RETURNING id, name, priority',
            [priority, id]
        );

        if (result.rows.length === 0) {
            throw new AppError('Tenant not found', 404);
        }

        res.json({
            success: true,
            data: result.rows[0],
            message: `Priority updated to ${priority}`
        });
    })
);

/**
 * @route   GET /api/tenants/:id
 */
router.get('/:id',
    protect,
    restrictTo('admin'),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM tenants WHERE id = $1', [id]);
        if (result.rows.length === 0) throw new AppError('Tenant not found', 404);
        res.json({ success: true, data: result.rows[0] });
    })
);

module.exports = router;
