const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { body, param, validationResult } = require('express-validator');
const evidenceController = require('../controllers/evidenceController');
const { asyncHandler } = require('../middleware/errorHandler');
const { restrictTo } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = process.env.EVIDENCE_STORAGE_PATH || './uploads/evidence';
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
        cb(null, `evidence-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const fileFilter = (req, file, cb) => {
    // Only allow images
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only images are allowed (JPEG, PNG, WebP)'));
    }
};

const upload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.UPLOAD_MAX_SIZE_MB || 10) * 1024 * 1024 // Default 10MB
    },
    fileFilter
});

/**
 * @route   POST /api/evidence
 * @desc    Upload evidence (photo with GPS + timestamp)
 * @access  Private (driver)
 */
router.post('/',
    restrictTo('driver'),
    upload.single('photo'),
    [
        body('bookingId').isInt(),
        body('assetType').isIn(['pickup_photo', 'dropoff_photo', 'location_screenshot', 'signature', 'other']),
        body('capturedAt').isISO8601(),
        body('gpsLat').isFloat({ min: -90, max: 90 }),
        body('gpsLng').isFloat({ min: -180, max: 180 }),
        body('gpsAccuracy').optional().isFloat({ min: 0 }),
        body('pickupLabel').optional().isString(),
        body('deviceId').optional().isString()
    ],
    asyncHandler(evidenceController.uploadEvidence)
);

/**
 * @route   GET /api/evidence/:id
 * @desc    Get evidence by ID
 * @access  Private
 */
router.get('/:id',
    param('id').isInt(),
    asyncHandler(evidenceController.getEvidenceById)
);

/**
 * @route   GET /api/evidence/booking/:bookingId
 * @desc    Get all evidence for a booking
 * @access  Private
 */
router.get('/booking/:bookingId',
    param('bookingId').isInt(),
    asyncHandler(evidenceController.getEvidenceByBooking)
);

/**
 * @route   DELETE /api/evidence/:id
 * @desc    Delete evidence (admin only, for GDPR compliance)
 * @access  Private (admin)
 */
router.delete('/:id',
    restrictTo('admin'),
    param('id').isInt(),
    asyncHandler(evidenceController.deleteEvidence)
);

module.exports = router;
