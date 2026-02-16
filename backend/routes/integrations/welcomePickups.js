const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../../config/database');
const bookingService = require('../../services/bookingService');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');
const logger = require('../../config/logger');

/**
 * Welcome Pickups Integration API
 * 
 * This endpoint handles incoming booking webhooks from Welcome Pickups.
 * Authentication is done via API key in the header.
 */

// Middleware to authenticate Welcome Pickups requests
const authenticateWelcomePickups = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey) {
        return res.status(401).json({
            success: false,
            error: 'API key required'
        });
    }

    try {
        // Find partner by API key
        const result = await db.query(
            `SELECT p.*, t.id as tenant_id 
             FROM partners p 
             JOIN tenants t ON p.tenant_id = t.id
             WHERE p.api_key = $1 AND p.is_active = true AND p.name ILIKE '%welcome%'`,
            [apiKey]
        );

        if (result.rows.length === 0) {
            logger.warn('Invalid Welcome Pickups API key attempt', { apiKey: apiKey.substring(0, 10) + '...' });
            return res.status(401).json({
                success: false,
                error: 'Invalid API key'
            });
        }

        req.partner = result.rows[0];
        req.tenantId = result.rows[0].tenant_id;
        next();
    } catch (error) {
        logger.error('Welcome Pickups auth error', { error: error.message });
        return res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};

/**
 * @route   POST /api/integrations/welcome-pickups/bookings
 * @desc    Create a new booking from Welcome Pickups
 * @access  Partner (API Key)
 */
router.post('/bookings',
    authenticateWelcomePickups,
    [
        body('booking_id').notEmpty().withMessage('Welcome booking ID is required'),
        body('passenger.name').notEmpty().withMessage('Passenger name is required'),
        body('passenger.phone').notEmpty().withMessage('Passenger phone is required'),
        body('pickup.address').notEmpty().withMessage('Pickup address is required'),
        body('pickup.latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid pickup latitude required'),
        body('pickup.longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid pickup longitude required'),
        body('pickup.datetime').isISO8601().withMessage('Valid pickup datetime required'),
        body('dropoff.address').optional(),
        body('dropoff.latitude').optional().isFloat({ min: -90, max: 90 }),
        body('dropoff.longitude').optional().isFloat({ min: -180, max: 180 }),
        body('passengers').optional().isInt({ min: 1, max: 10 }),
        body('luggage').optional().isInt({ min: 0, max: 20 }),
        body('vehicle_type').optional().isString(),
        body('flight_number').optional().isString(),
        body('notes').optional().isString()
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const {
            booking_id,
            passenger,
            pickup,
            dropoff,
            passengers,
            luggage,
            vehicle_type,
            flight_number,
            notes,
            price
        } = req.body;

        logger.info('Welcome Pickups booking received', {
            welcomeBookingId: booking_id,
            partnerId: req.partner.id
        });

        // Check for duplicate booking
        const existing = await db.query(
            'SELECT id FROM bookings WHERE external_reference = $1 AND partner_id = $2',
            [booking_id, req.partner.id]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Booking already exists',
                booking_reference: existing.rows[0].booking_reference
            });
        }

        // Create booking
        const bookingData = {
            partnerId: req.partner.id,
            passengerName: passenger.name,
            passengerPhone: passenger.phone,
            passengerEmail: passenger.email,
            source: 'welcome',
            externalReference: booking_id,
            pickupAddress: pickup.address,
            pickupLat: pickup.latitude,
            pickupLng: pickup.longitude,
            scheduledPickupTime: pickup.datetime,
            dropoffAddress: dropoff?.address || null,
            dropoffLat: dropoff?.latitude || null,
            dropoffLng: dropoff?.longitude || null,
            fareEstimate: price?.amount || null,
            paymentMethod: price?.payment_method || 'cash',
            passengerNotes: [
                notes,
                flight_number ? `Flight: ${flight_number}` : null,
                passengers ? `Passengers: ${passengers}` : null,
                luggage ? `Luggage: ${luggage}` : null
            ].filter(Boolean).join(' | '),
            requirements: {
                vehicleType: vehicle_type || 'sedan',
                minLuggageCapacity: luggage || 2,
                passengerCount: passengers || 1
            }
        };

        // Create using a system user for the partner
        const createdBy = {
            id: req.partner.id,
            type: 'partner',
            tenantId: req.tenantId
        };

        const booking = await bookingService.createBooking(bookingData, createdBy);

        // Broadcast to WebSocket
        const io = req.app.get('io');
        if (io && io.broadcastBookingCreated) {
            io.broadcastBookingCreated({
                ...booking,
                partner_name: req.partner.name,
                source: 'welcome'
            });
        }

        logger.info('Welcome Pickups booking created', {
            bookingId: booking.id,
            reference: booking.booking_reference,
            welcomeBookingId: booking_id
        });

        res.status(201).json({
            success: true,
            data: {
                booking_reference: booking.booking_reference,
                status: booking.status,
                id: booking.id
            }
        });
    })
);

/**
 * @route   PATCH /api/integrations/welcome-pickups/bookings/:external_id/cancel
 * @desc    Cancel a booking from Welcome Pickups
 * @access  Partner (API Key)
 */
router.patch('/bookings/:external_id/cancel',
    authenticateWelcomePickups,
    [
        body('reason').optional().isString()
    ],
    asyncHandler(async (req, res) => {
        const { external_id } = req.params;
        const { reason } = req.body;

        const result = await db.query(
            `UPDATE bookings 
             SET status = 'cancelled', cancelled_at = NOW(), admin_notes = $1
             WHERE external_reference = $2 AND partner_id = $3 AND status NOT IN ('completed', 'cancelled')
             RETURNING *`,
            [reason || 'Cancelled by Welcome Pickups', external_id, req.partner.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found or already completed/cancelled'
            });
        }

        logger.info('Welcome Pickups booking cancelled', {
            bookingId: result.rows[0].id,
            welcomeBookingId: external_id
        });

        res.json({
            success: true,
            data: {
                booking_reference: result.rows[0].booking_reference,
                status: 'cancelled'
            }
        });
    })
);

/**
 * @route   GET /api/integrations/welcome-pickups/bookings/:external_id/status
 * @desc    Get booking status for Welcome Pickups
 * @access  Partner (API Key)
 */
router.get('/bookings/:external_id/status',
    authenticateWelcomePickups,
    asyncHandler(async (req, res) => {
        const { external_id } = req.params;

        const result = await db.query(
            `SELECT b.booking_reference, b.status, b.driver_id,
                    u.first_name || ' ' || u.last_name as driver_name,
                    u.phone as driver_phone,
                    v.license_plate, v.make, v.model, v.color
             FROM bookings b
             LEFT JOIN drivers d ON b.driver_id = d.id
             LEFT JOIN users u ON d.user_id = u.id
             LEFT JOIN vehicles v ON b.vehicle_id = v.id
             WHERE b.external_reference = $1 AND b.partner_id = $2`,
            [external_id, req.partner.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }

        const booking = result.rows[0];

        res.json({
            success: true,
            data: {
                booking_reference: booking.booking_reference,
                status: booking.status,
                driver: booking.driver_id ? {
                    name: booking.driver_name,
                    phone: booking.driver_phone,
                    vehicle: {
                        license_plate: booking.license_plate,
                        make: booking.make,
                        model: booking.model,
                        color: booking.color
                    }
                } : null
            }
        });
    })
);

/**
 * @route   POST /api/integrations/welcome-pickups/webhook/test
 * @desc    Test webhook endpoint
 * @access  Partner (API Key)
 */
router.post('/webhook/test',
    authenticateWelcomePickups,
    (req, res) => {
        res.json({
            success: true,
            message: 'Webhook connection successful',
            partner: req.partner.name,
            timestamp: new Date().toISOString()
        });
    }
);

module.exports = router;
