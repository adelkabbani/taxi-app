const express = require('express');
const { query, body, param } = require('express-validator');
const driverScheduleService = require('../services/driverScheduleService');
const { asyncHandler } = require('../middleware/errorHandler');
const { protect, restrictTo } = require('../middleware/auth');
const db = require('../config/database');

const router = express.Router();

/**
 * @route   POST /api/driver-schedules/batch
 * @desc    Batch update driver schedule for multiple dates
 * @access  Private (Driver)
 */
router.post('/batch',
    protect,
    restrictTo('driver'),
    [
        body('schedules').isArray().withMessage('Schedules must be an array'),
        body('schedules.*.date').isISO8601().toDate(),
        body('schedules.*.start').matches(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/),
        body('schedules.*.end').matches(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/),
        body('schedules.*.shiftType').isIn(['AM', 'PM', 'FULL', 'CUSTOM']),
        body('schedules.*.isHoliday').optional().isBoolean()
    ],
    asyncHandler(async (req, res) => {
        const { id: userId } = req.user;
        const driverResult = await db.query('SELECT id FROM drivers WHERE user_id = $1', [userId]);

        if (driverResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Driver profile not found' });
        }

        const driverId = driverResult.rows[0].id;
        const { schedules } = req.body;

        const results = await driverScheduleService.batchUpdateSchedule(driverId, schedules);

        res.status(200).json({
            success: true,
            data: results
        });
    })
);

/**
 * @route   GET /api/driver-schedules/my-schedule
 * @desc    Get driver's own schedule for a range
 */
router.get('/my-schedule',
    protect,
    restrictTo('driver'),
    [
        query('start_date').isISO8601(),
        query('end_date').isISO8601()
    ],
    asyncHandler(async (req, res) => {
        const { id: userId } = req.user;
        const { start_date, end_date } = req.query;

        const driverResult = await db.query('SELECT id FROM drivers WHERE user_id = $1', [userId]);

        if (driverResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Driver profile not found' });
        }

        const schedules = await driverScheduleService.getScheduleRange(
            driverResult.rows[0].id,
            start_date,
            end_date
        );

        res.json({
            success: true,
            data: schedules
        });
    })
);

/**
 * @route   DELETE /api/driver-schedules/my-schedule/:date
 */
router.delete('/my-schedule/:date',
    protect,
    restrictTo('driver'),
    asyncHandler(async (req, res) => {
        const { id: userId } = req.user;
        const driverResult = await db.query('SELECT id FROM drivers WHERE user_id = $1', [userId]);

        if (driverResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Driver profile not found' });
        }

        await driverScheduleService.deleteSchedule(
            driverResult.rows[0].id,
            req.params.date
        );

        res.json({ success: true });
    })
);

module.exports = router;
