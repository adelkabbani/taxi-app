const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const bookingController = require('../controllers/bookingController');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { restrictTo } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * @route   GET /api/bookings
 * @desc    Get all bookings (with filters)
 * @access  Private (all roles)
 */
router.get('/',
    [
        query('status').optional().isString(),
        query('driverId').optional().isInt(),
        query('passengerId').optional().isInt(),
        query('partnerId').optional().isInt(),
        query('from').optional().isISO8601(),
        query('to').optional().isISO8601(),
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 })
    ],
    asyncHandler(bookingController.getAllBookings)
);

/**
 * @route   GET /api/bookings/:id
 * @desc    Get booking by ID
 * @access  Private (all roles)
 */
router.get('/:id',
    param('id').isInt(),
    asyncHandler(bookingController.getBookingById)
);

/**
 * @route   POST /api/bookings
 * @desc    Create new booking
 * @access  Private (admin, passenger)
 */
router.post('/',
    rateLimiter.bookingCreation,
    [
        body('passengerId').optional().isInt(),
        body('passengerPhone').isMobilePhone(),
        body('passengerName').optional().isString(),
        body('partnerId').optional().isInt(),
        body('pickupAddress').notEmpty(),
        body('pickupLat').isFloat({ min: -90, max: 90 }),
        body('pickupLng').isFloat({ min: -180, max: 180 }),
        body('dropoffAddress').optional().isString(),
        body('dropoffLat').optional().isFloat({ min: -90, max: 90 }),
        body('dropoffLng').optional().isFloat({ min: -180, max: 180 }),
        body('scheduledPickupTime').optional().isISO8601(),
        body('fareEstimate').optional().isFloat({ min: 0 }),
        body('passengerNotes').optional().isString(),
        body('requirements').optional().isObject()
    ],
    asyncHandler(bookingController.createBooking)
);

/**
 * @route   PATCH /api/bookings/:id/assign
 * @desc    Assign driver to booking
 * @access  Private (admin)
 */
router.patch('/:id/assign',
    restrictTo('admin'),
    [
        param('id').isInt(),
        body('driverId').isInt()
    ],
    asyncHandler(bookingController.assignDriver)
);

/**
 * @route   PATCH /api/bookings/:id/accept
 * @desc    Driver accepts booking
 * @access  Private (driver)
 */
router.patch('/:id/accept',
    restrictTo('driver'),
    param('id').isInt(),
    asyncHandler(bookingController.acceptBooking)
);

/**
 * @route   PATCH /api/bookings/:id/reject
 * @desc    Driver rejects booking
 * @access  Private (driver)
 */
router.patch('/:id/reject',
    restrictTo('driver'),
    [
        param('id').isInt(),
        body('reason').optional().isString()
    ],
    asyncHandler(bookingController.rejectBooking)
);

/**
 * @route   PATCH /api/bookings/:id/arrive
 * @desc    Driver marks arrived (with geo-check)
 * @access  Private (driver)
 */
router.patch('/:id/arrive',
    restrictTo('driver'),
    [
        param('id').isInt(),
        body('lat').isFloat({ min: -90, max: 90 }),
        body('lng').isFloat({ min: -180, max: 180 }),
        body('accuracy').optional().isFloat({ min: 0 })
    ],
    asyncHandler(bookingController.markArrived)
);

/**
 * @route   PATCH /api/bookings/:id/start
 * @desc    Start trip
 * @access  Private (driver)
 */
router.patch('/:id/start',
    restrictTo('driver'),
    param('id').isInt(),
    asyncHandler(bookingController.startTrip)
);

/**
 * @route   PATCH /api/bookings/:id/complete
 * @desc    Complete trip
 * @access  Private (driver)
 */
router.patch('/:id/complete',
    restrictTo('driver'),
    [
        param('id').isInt(),
        body('fareFinal').optional().isFloat({ min: 0 }),
        body('driverNotes').optional().isString()
    ],
    asyncHandler(bookingController.completeTrip)
);

/**
 * @route   PATCH /api/bookings/:id/cancel
 * @desc    Cancel booking
 * @access  Private (admin, passenger, driver)
 */
router.patch('/:id/cancel',
    [
        param('id').isInt(),
        body('reason').optional().isString()
    ],
    asyncHandler(bookingController.cancelBooking)
);

/**
 * @route   POST /api/bookings/:id/no-show-request
 * @desc    Driver requests no-show (requires evidence)
 * @access  Private (driver)
 */
router.post('/:id/no-show-request',
    restrictTo('driver'),
    [
        param('id').isInt(),
        body('evidenceIds').isArray({ min: 1 }),
        body('notes').optional().isString()
    ],
    asyncHandler(bookingController.requestNoShow)
);

/**
 * @route   PATCH /api/bookings/:id/no-show-confirm
 * @desc    Admin confirms no-show
 * @access  Private (admin)
 */
router.patch('/:id/no-show-confirm',
    restrictTo('admin'),
    param('id').isInt(),
    asyncHandler(bookingController.confirmNoShow)
);

/**
 * @route   GET /api/bookings/:id/timeline
 * @desc    Get booking timeline (complete event history)
 * @access  Private (all roles)
 */
router.get('/:id/timeline',
    param('id').isInt(),
    asyncHandler(bookingController.getBookingTimeline)
);

/**
 * @route   GET /api/bookings/:id/evidence
 * @desc    Get all evidence for booking
 * @access  Private (all roles)
 */
router.get('/:id/evidence',
    param('id').isInt(),
    asyncHandler(bookingController.getBookingEvidence)
);

/**
 * @route   PATCH /api/bookings/:id/override
 * @desc    Admin override booking status
 * @access  Private (admin only)
 */
router.patch('/:id/override',
    restrictTo('admin'),
    [
        param('id').isInt(),
        body('newStatus').isString(),
        body('reason').notEmpty()
    ],
    asyncHandler(bookingController.adminOverride)
);

/**
 * @route   PATCH /api/bookings/:id/accept-auto-assignment
 * @desc    Driver accepts an automated assignment
 */
router.patch('/:id/accept-auto-assignment',
    restrictTo('driver'),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const driverResult = await require('../config/database').query(
            'SELECT id FROM drivers WHERE user_id = $1',
            [req.user.id]
        );

        const booking = await require('../services/assignmentService').handleDriverAcceptance(
            id,
            driverResult.rows[0].id
        );

        res.json({ success: true, data: booking });
    })
);

/**
 * @route   PATCH /api/bookings/:id/reject-auto-assignment
 * @desc    Driver rejects an automated assignment
 */
router.patch('/:id/reject-auto-assignment',
    restrictTo('driver'),
    [
        body('rejectionReason').notEmpty().withMessage('Rejection reason is required')
    ],
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { rejectionReason } = req.body;

        const driverResult = await require('../config/database').query(
            'SELECT id FROM drivers WHERE user_id = $1',
            [req.user.id]
        );

        const result = await require('../services/assignmentService').handleDriverRejection(
            id,
            driverResult.rows[0].id,
            rejectionReason
        );

        res.json({ success: true, ...result });
    })
);

/**
 * @route   PATCH /api/bookings/:id/manual-reassign
 * @desc    Admin manual override of assignment
 */
router.patch('/:id/manual-reassign',
    restrictTo('admin'),
    [
        body('driverId').isInt().withMessage('Valid driverId required')
    ],
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { driverId } = req.body;
        const db = require('../config/database');

        await db.transaction(async (client) => {
            // 1. Update booking
            await client.query(
                `UPDATE bookings 
                 SET driver_id = $1, 
                     status = 'assigned', 
                     assignment_method = 'manual',
                     updated_at = NOW()
                 WHERE id = $2`,
                [driverId, id]
            );

            // 2. Mark previous attempts as stale
            await client.query(
                `UPDATE assignment_attempts 
                 SET is_current_assignment = false 
                 WHERE booking_id = $1`,
                [id]
            );

            // 3. Log manual assignment
            await client.query(
                `INSERT INTO assignment_attempts (booking_id, driver_id, assignment_method, status, responded_at)
                 VALUES ($1, $2, 'manual', 'accepted', NOW())`,
                [id, driverId]
            );
        });

        res.json({ success: true, message: 'Booking manually reassigned' });
    })
);

module.exports = router;
