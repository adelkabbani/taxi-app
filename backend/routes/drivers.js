const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const driverController = require('../controllers/driverController');
const { asyncHandler } = require('../middleware/errorHandler');
const { restrictTo } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/drivers
 * @desc    Get all drivers with filters
 * @access  Private (admin)
 */
router.get('/',
    restrictTo('admin'),
    [
        query('availability').optional().isIn(['available', 'busy', 'offline', 'on_break']),
        query('includeStale').optional().isBoolean(),
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 })
    ],
    asyncHandler(driverController.getAllDrivers)
);

/**
 * @route   GET /api/drivers/assignment/:bookingId
 * @desc    Get full fleet for assignment (Isolated)
 * @access  Private (admin/fleet_manager)
 */
router.get('/assignment/:bookingId',
    restrictTo('admin', 'fleet_manager'),
    asyncHandler(driverController.getFleetForAssignment)
);

/**
 * @route   POST /api/drivers
 * @desc    Create a new driver and vehicle
 * @access  Private (admin/fleet_manager)
 */
router.post('/',
    restrictTo('admin', 'fleet_manager'),
    [
        body('firstName').notEmpty(),
        body('lastName').notEmpty(),
        body('email').isEmail(),
        body('phone').notEmpty(),
        body('password').isLength({ min: 6 }),
        body('licensePlate').notEmpty(),
        body('make').notEmpty(),
        body('model').notEmpty(),
        body('year').isInt(),
        body('vehicleType').isIn(['sedan', 'van', 'business_van', 'luxury', 'accessible']),
        body('licenseNumber').notEmpty()
    ],
    asyncHandler(driverController.createDriver)
);

/**
 * @route   GET /api/drivers/stats
 * @desc    Get real-time statistics for the logged-in driver
 * @access  Private (driver)
 */
router.get('/stats',
    restrictTo('driver'),
    asyncHandler(driverController.getDriverStats)
);

/**
 * @route   GET /api/drivers/:id
 * @desc    Get driver by ID with metrics
 * @access  Private
 */
router.get('/:id',
    param('id').isInt(),
    asyncHandler(driverController.getDriverById)
);

/**
 * @route   GET /api/drivers/me/profile
 * @desc    Get current driver's profile
 * @access  Private (driver)
 */
router.get('/me/profile',
    restrictTo('driver'),
    asyncHandler(driverController.getMyProfile)
);

/**
 * @route   GET /api/drivers/me/trips
 * @desc    Get trip history for the logged-in driver (completed, cancelled, shuttles)
 * @access  Private (driver)
 */
router.get('/me/trips',
    restrictTo('driver'),
    asyncHandler(async (req, res) => {
        const db = require('../config/database');
        const { type = 'completed', page = 1, limit = 30 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Map type to booking statuses
        const statusMap = {
            completed: ['completed'],
            cancelled: ['cancelled', 'no_show_confirmed', 'auto_released'],
            shuttles: ['completed', 'cancelled'] // shuttle bookings filtered by source
        };

        const statuses = statusMap[type] || statusMap.completed;

        let whereExtra = '';
        if (type === 'shuttles') {
            whereExtra = `AND b.source = 'shuttle'`;
        }

        const result = await db.query(
            `SELECT
                b.id,
                b.booking_reference,
                b.pickup_address,
                b.dropoff_address,
                b.scheduled_pickup_time,
                b.actual_pickup_time,
                b.actual_dropoff_time,
                b.status,
                b.passenger_name,
                b.passenger_count,
                b.luggage_count,
                b.fare_estimate,
                b.fare_final,
                b.waiting_fee,
                b.source,
                b.flight_number
             FROM bookings b
             JOIN driver_assignments da ON da.booking_id = b.id
             JOIN drivers d ON da.driver_id = d.id
             WHERE d.user_id = $1
               AND b.status = ANY($2)
               ${whereExtra}
               AND da.status IN ('accepted', 'completed')
             ORDER BY b.scheduled_pickup_time DESC
             LIMIT $3 OFFSET $4`,
            [req.user.id, statuses, parseInt(limit), offset]
        );

        res.json({ success: true, data: result.rows });
    })
);

/**
 * @route   PATCH /api/drivers/:id/availability
 * @desc    Update driver availability
 * @access  Private (driver or admin)
 */
router.patch('/:id/availability',
    [
        param('id').isInt(),
        body('availability').isIn(['available', 'busy', 'offline', 'on_break'])
    ],
    asyncHandler(driverController.updateAvailability)
);

/**
 * @route   POST /api/drivers/location
 * @desc    Update driver location
 * @access  Private (driver)
 */
router.post('/location',
    restrictTo('driver'),
    [
        body('lat').isFloat({ min: -90, max: 90 }),
        body('lng').isFloat({ min: -180, max: 180 }),
        body('accuracy').optional().isFloat({ min: 0 }),
        body('heading').optional().isFloat({ min: 0, max: 360 }),
        body('speed').optional().isFloat({ min: 0 })
    ],
    asyncHandler(driverController.updateLocation)
);

/**
 * @route   GET /api/drivers/nearby
 * @desc    Find drivers near a location
 * @access  Private (admin)
 */
router.get('/nearby/:lat/:lng',
    restrictTo('admin'),
    [
        param('lat').isFloat({ min: -90, max: 90 }),
        param('lng').isFloat({ min: -180, max: 180 }),
        query('radius').optional().isInt({ min: 100, max: 50000 }),
        query('vehicleType').optional().isString(),
        query('requireAirportPermit').optional().isBoolean()
    ],
    asyncHandler(driverController.findNearbyDrivers)
);

/**
 * @route   GET /api/drivers/:id/metrics
 * @desc    Get driver performance metrics (admin only)
 * @access  Private (admin)
 */
router.get('/:id/metrics',
    restrictTo('admin'),
    param('id').isInt(),
    asyncHandler(driverController.getDriverMetrics)
);

/**
 * @route   POST /api/drivers/:id/shift/start
 * @desc    Start driver shift
 * @access  Private (driver)
 */
router.post('/:id/shift/start',
    restrictTo('driver'),
    param('id').isInt(),
    asyncHandler(driverController.startShift)
);

/**
 * @route   POST /api/drivers/:id/shift/end
 * @desc    End driver shift
 * @access  Private (driver)
 */
router.post('/:id/shift/end',
    restrictTo('driver'),
    param('id').isInt(),
    asyncHandler(driverController.endShift)
);

/**
 * @route   POST /api/drivers/:id/break/start
 * @desc    Start break
 * @access  Private (driver)
 */
router.post('/:id/break/start',
    restrictTo('driver'),
    param('id').isInt(),
    asyncHandler(driverController.startBreak)
);

/**
 * @route   POST /api/drivers/:id/break/end
 * @desc    End break
 * @access  Private (driver)
 */
router.post('/:id/break/end',
    restrictTo('driver'),
    param('id').isInt(),
    asyncHandler(driverController.endBreak)
);

/**
 * @route   GET /api/drivers/airport-tracking/:bookingId
 * @desc    Get driver movement intelligence for airport booking
 * @access  Private (admin)
 */
router.get('/airport-tracking/:bookingId',
    restrictTo('admin'),
    param('bookingId').isInt(),
    asyncHandler(driverController.getAirportTracking)
);

/**
 * @route   POST /api/drivers/:id/suspend
 * @desc    Suspend a driver with a reason
 * @access  Private (admin/fleet_manager)
 */
router.post('/:id/suspend',
    restrictTo('admin', 'fleet_manager'),
    [
        param('id').isInt(),
        body('reason').notEmpty(),
        body('expiresAt').optional().isISO8601()
    ],
    asyncHandler(driverController.suspendDriver)
);

/**
 * @route   POST /api/drivers/:id/unsuspend
 * @desc    Unsuspend a driver
 * @access  Private (admin/fleet_manager)
 */
router.post('/:id/unsuspend',
    restrictTo('admin', 'fleet_manager'),
    param('id').isInt(),
    asyncHandler(driverController.unsuspendDriver)
);

/**
 * @route   PATCH /api/drivers/:id/password
 * @desc    Update driver password (admin override)
 * @access  Private (admin)
 */
router.patch('/:id/password',
    restrictTo('admin'),
    [
        param('id').isInt(),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    ],
    asyncHandler(driverController.updateDriverPassword)
);

module.exports = router;
