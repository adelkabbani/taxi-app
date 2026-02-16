const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { restrictTo } = require('../middleware/auth');
const DocumentService = require('../services/documentService');
const fileUpload = require('express-fileupload');

const router = express.Router();

// Enable file upload middleware
router.use(fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    abortOnLimit: true,
    responseOnLimit: 'File size exceeds the 10MB limit'
}));

/**
 * @route   POST /api/documents/upload
 * @desc    Upload a document for a driver
 * @access  Private (admin, driver)
 */
router.post('/upload',
    [
        body('driverId').isInt().withMessage('Valid driver ID required'),
        body('documentType').isIn(['cv', 'license', 'certificate', 'insurance', 'work_experience'])
            .withMessage('Invalid document type'),
        body('expiryDate').optional().isISO8601().withMessage('Valid date required'),
        body('notes').optional().isString()
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { driverId, documentType, expiryDate, notes } = req.body;

        // Check if user has permission (admin or own driver profile)
        if (req.user.role !== 'admin') {
            // Check if this is the driver's own profile
            const driverCheck = await require('../config/database').query(
                'SELECT id FROM drivers WHERE id = $1 AND user_id = $2',
                [driverId, req.user.id]
            );

            if (driverCheck.rows.length === 0) {
                throw new AppError('You can only upload documents for your own profile', 403);
            }
        }

        // Check if file was uploaded
        if (!req.files || !req.files.document) {
            throw new AppError('No file uploaded', 400);
        }

        const document = await DocumentService.uploadDocument(
            driverId,
            { documentType, expiryDate, notes },
            req.files.document
        );

        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            data: document
        });
    })
);

/**
 * @route   GET /api/documents/driver/:driverId
 * @desc    Get all documents for a driver
 * @access  Private (admin, own driver profile)
 */
router.get('/driver/:driverId',
    param('driverId').isInt(),
    asyncHandler(async (req, res) => {
        const { driverId } = req.params;
        const { status, documentType } = req.query;

        // Permission check
        if (req.user.role !== 'admin') {
            const driverCheck = await require('../config/database').query(
                'SELECT id FROM drivers WHERE id = $1 AND user_id = $2',
                [driverId, req.user.id]
            );

            if (driverCheck.rows.length === 0) {
                throw new AppError('Access denied', 403);
            }
        }

        const documents = await DocumentService.getDriverDocuments(driverId, {
            status,
            documentType
        });

        res.json({
            success: true,
            count: documents.length,
            data: documents
        });
    })
);

/**
 * @route   GET /api/documents/pending
 * @desc    Get all pending documents for verification (admin)
 * @access  Private (admin only)
 */
router.get('/pending',
    restrictTo('admin'),
    asyncHandler(async (req, res) => {
        const documents = await DocumentService.getPendingDocuments(req.user.tenantId);

        res.json({
            success: true,
            count: documents.length,
            data: documents
        });
    })
);

/**
 * @route   PATCH /api/documents/:id/verify
 * @desc    Verify (approve/reject) a document
 * @access  Private (admin only)
 */
router.patch('/:id/verify',
    restrictTo('admin'),
    [
        param('id').isInt(),
        body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
        body('notes').optional().isString()
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { id } = req.params;
        const { status, notes } = req.body;

        const document = await DocumentService.verifyDocument(
            id,
            status,
            req.user.id,
            notes
        );

        res.json({
            success: true,
            message: `Document ${status} successfully`,
            data: document
        });
    })
);

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete a document
 * @access  Private (admin, own driver profile)
 */
router.delete('/:id',
    param('id').isInt(),
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        // Get document to check ownership
        const docResult = await require('../config/database').query(
            'SELECT driver_id FROM driver_documents WHERE id = $1',
            [id]
        );

        if (docResult.rows.length === 0) {
            throw new AppError('Document not found', 404);
        }

        // Permission check
        if (req.user.role !== 'admin') {
            const driverCheck = await require('../config/database').query(
                'SELECT id FROM drivers WHERE id = $1 AND user_id = $2',
                [docResult.rows[0].driver_id, req.user.id]
            );

            if (driverCheck.rows.length === 0) {
                throw new AppError('Access denied', 403);
            }
        }

        const result = await DocumentService.deleteDocument(id, req.user.id);

        res.json(result);
    })
);

/**
 * @route   GET /api/documents/stats
 * @desc    Get document statistics for tenant
 * @access  Private (admin only)
 */
router.get('/stats',
    restrictTo('admin'),
    asyncHandler(async (req, res) => {
        const stats = await DocumentService.getDocumentStats(req.user.tenantId);

        res.json({
            success: true,
            data: stats
        });
    })
);

/**
 * @route   POST /api/documents/check-expired
 * @desc    Manually trigger expired document check
 * @access  Private (admin only)
 */
router.post('/check-expired',
    restrictTo('admin'),
    asyncHandler(async (req, res) => {
        const result = await DocumentService.checkExpiredDocuments();

        res.json({
            success: true,
            data: result
        });
    })
);

module.exports = router;
