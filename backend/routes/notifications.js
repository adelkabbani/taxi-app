const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const db = require('../config/database');

const router = express.Router();

/**
 * @route   GET /api/notifications
 * @desc    Get notifications for the logged-in user (unread first)
 * @access  Private
 */
router.get('/', asyncHandler(async (req, res) => {
    const { limit = 20, unread_only } = req.query;

    let where = 'WHERE recipient_user_id = $1';
    const values = [req.user.id];

    if (unread_only === 'true') {
        where += ' AND read_at IS NULL';
    }

    const result = await db.query(
        `SELECT id, title, message, status, channel, read_at, sent_at, created_at, metadata
         FROM notifications
         ${where}
         ORDER BY created_at DESC
         LIMIT $2`,
        [...values, parseInt(limit)]
    );

    const unreadCount = result.rows.filter(n => !n.read_at).length;

    res.json({ success: true, data: result.rows, unreadCount });
}));

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Private
 */
router.patch('/:id/read', asyncHandler(async (req, res) => {
    await db.query(
        'UPDATE notifications SET read_at = NOW() WHERE id = $1 AND recipient_user_id = $2',
        [req.params.id, req.user.id]
    );
    res.json({ success: true });
}));

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.patch('/read-all', asyncHandler(async (req, res) => {
    await db.query(
        'UPDATE notifications SET read_at = NOW() WHERE recipient_user_id = $1 AND read_at IS NULL',
        [req.user.id]
    );
    res.json({ success: true });
}));

module.exports = router;
