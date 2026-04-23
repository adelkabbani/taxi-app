const express = require('express');
const db = require('../config/database');
const { generateToken } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @route   POST /api/admin/impersonate
 * @desc    Generate a JWT for a target user (Super Admin only)
 * @access  Private (Super Admin)
 */
router.post('/impersonate', asyncHandler(async (req, res) => {
    // 1. Verify Super Admin (role === admin & tenant_id IS NULL)
    if (req.user.role !== 'admin' || req.user.tenant_id !== null) {
        throw new AppError('Access denied. Super Admin privileges required.', 403);
    }

    const { userId } = req.body;
    if (!userId) {
        throw new AppError('Target userId is required.', 400);
    }

    // 2. Fetch target user
    const result = await db.query(
        "SELECT * FROM users WHERE id = $1 AND status = 'active'",
        [userId]
    );

    if (result.rows.length === 0) {
        throw new AppError('Target user not found or inactive.', 404);
    }

    const targetUser = result.rows[0];

    // 3. Generate Token for target user
    const token = generateToken(targetUser);

    res.json({
        success: true,
        token,
        user: {
            id: targetUser.id,
            email: targetUser.email,
            role: targetUser.role
        }
    });
}));

module.exports = router;
