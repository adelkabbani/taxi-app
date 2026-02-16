const db = require('../config/database');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

/**
 * Document Service
 * Handles driver document upload, validation, and verification
 */

class DocumentService {
    /**
     * Upload a new document for a driver
     */
    static async uploadDocument(driverId, documentData, file) {
        const { documentType, expiryDate, notes } = documentData;

        // Validate document type
        const validTypes = ['cv', 'license', 'certificate', 'insurance', 'work_experience'];
        if (!validTypes.includes(documentType)) {
            throw new Error(`Invalid document type. Must be one of: ${validTypes.join(', ')}`);
        }

        // Validate file
        if (!file) {
            throw new Error('No file provided');
        }

        // Check file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new Error('File size exceeds 10MB limit');
        }

        // Validate file type
        const allowedMimeTypes = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        // Check allowed types
        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new Error('Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX');
        }

        // Generate unique filename
        const filename = file.name || file.originalname;
        const fileExt = path.extname(filename);
        const uniqueFilename = `${driverId}_${documentType}_${Date.now()}${fileExt}`;

        // Save file (local storage for now, can be extended to S3)
        const uploadsDir = path.join(__dirname, '../../uploads/documents');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const filePath = path.join(uploadsDir, uniqueFilename);
        await file.mv(filePath);

        // Create file URL (relative path)
        const fileUrl = `/uploads/documents/${uniqueFilename}`;

        // Insert document record
        const query = `
            INSERT INTO driver_documents 
            (driver_id, document_type, file_url, file_name, file_size_bytes, mime_type, expiry_date, notes, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
            RETURNING *
        `;

        const values = [
            driverId,
            documentType,
            fileUrl,
            file.originalname,
            file.size,
            file.mimetype,
            expiryDate || null,
            notes || null
        ];

        const result = await db.query(query, values);

        // Log event
        await this.logDocumentEvent(result.rows[0].id, 'document_uploaded', {
            driver_id: driverId,
            document_type: documentType
        });

        return result.rows[0];
    }

    /**
     * Get all documents for a driver
     */
    static async getDriverDocuments(driverId, filters = {}) {
        let query = `
            SELECT 
                dd.*,
                u.first_name || ' ' || u.last_name AS verified_by_name
            FROM driver_documents dd
            LEFT JOIN users u ON dd.verified_by_user_id = u.id
            WHERE dd.driver_id = $1
        `;

        const values = [driverId];
        let paramIndex = 2;

        if (filters.status) {
            query += ` AND dd.status = $${paramIndex}`;
            values.push(filters.status);
            paramIndex++;
        }

        if (filters.documentType) {
            query += ` AND dd.document_type = $${paramIndex}`;
            values.push(filters.documentType);
            paramIndex++;
        }

        query += ' ORDER BY dd.created_at DESC';

        const result = await db.query(query, values);
        return result.rows;
    }

    /**
     * Get pending documents for verification (admin)
     */
    static async getPendingDocuments(tenantId) {
        const query = `
            SELECT * FROM document_verification_queue
            WHERE driver_id IN (
                SELECT d.id FROM drivers d
                JOIN users u ON d.user_id = u.id
                WHERE u.tenant_id = $1
            )
            ORDER BY days_pending DESC, uploaded_at ASC
        `;

        const result = await db.query(query, [tenantId]);
        return result.rows;
    }

    /**
     * Verify a document (approve or reject)
     */
    static async verifyDocument(documentId, status, verifiedByUserId, notes = null) {
        if (!['approved', 'rejected'].includes(status)) {
            throw new Error('Status must be either "approved" or "rejected"');
        }

        const query = `
            UPDATE driver_documents
            SET 
                status = $1,
                verified_at = NOW(),
                verified_by_user_id = $2,
                notes = COALESCE($3, notes)
            WHERE id = $4
            RETURNING *
        `;

        const result = await db.query(query, [status, verifiedByUserId, notes, documentId]);

        if (result.rows.length === 0) {
            throw new Error('Document not found');
        }

        const document = result.rows[0];

        // Log event
        await this.logDocumentEvent(documentId, `document_${status}`, {
            verified_by: verifiedByUserId,
            notes
        });

        // TODO: Send notification to driver

        return document;
    }

    /**
     * Delete a document
     */
    static async deleteDocument(documentId, userId) {
        // Get document info first
        const getQuery = 'SELECT * FROM driver_documents WHERE id = $1';
        const docResult = await db.query(getQuery, [documentId]);

        if (docResult.rows.length === 0) {
            throw new Error('Document not found');
        }

        const document = docResult.rows[0];

        // Delete file from storage
        const filePath = path.join(__dirname, '../..', document.file_url);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete from database
        const deleteQuery = 'DELETE FROM driver_documents WHERE id = $1';
        await db.query(deleteQuery, [documentId]);

        // Log event
        await this.logDocumentEvent(documentId, 'document_deleted', {
            deleted_by: userId,
            document_type: document.document_type
        });

        return { success: true, message: 'Document deleted successfully' };
    }

    /**
     * Check for expired documents and update their status
     */
    static async checkExpiredDocuments() {
        const query = `SELECT check_expired_documents()`;
        await db.query(query);

        // Get count of expired documents
        const countQuery = `
            SELECT COUNT(*) as count
            FROM driver_documents
            WHERE status = 'expired'
                AND expiry_date < CURRENT_DATE
        `;
        const result = await db.query(countQuery);

        return {
            expiredCount: parseInt(result.rows[0].count),
            message: `Marked ${result.rows[0].count} documents as expired`
        };
    }

    /**
     * Get document statistics
     */
    static async getDocumentStats(tenantId) {
        const query = `
            SELECT 
                dd.status,
                dd.document_type,
                COUNT(*) as count
            FROM driver_documents dd
            JOIN drivers d ON dd.driver_id = d.id
            JOIN users u ON d.user_id = u.id
            WHERE u.tenant_id = $1
            GROUP BY dd.status, dd.document_type
            ORDER BY dd.status, dd.document_type
        `;

        const result = await db.query(query, [tenantId]);

        // Transform to summary format
        const summary = {
            pending: 0,
            approved: 0,
            rejected: 0,
            expired: 0,
            byType: {}
        };

        result.rows.forEach(row => {
            summary[row.status] = (summary[row.status] || 0) + parseInt(row.count);

            if (!summary.byType[row.document_type]) {
                summary.byType[row.document_type] = {
                    pending: 0,
                    approved: 0,
                    rejected: 0,
                    expired: 0
                };
            }
            summary.byType[row.document_type][row.status] = parseInt(row.count);
        });

        return summary;
    }

    /**
     * Log document-related event
     */
    static async logDocumentEvent(documentId, eventType, data = {}) {
        const query = `
            INSERT INTO event_logs (tenant_id, event_type, actor_type, data)
            VALUES (
                (SELECT u.tenant_id FROM driver_documents dd
                 JOIN drivers d ON dd.driver_id = d.id
                 JOIN users u ON d.user_id = u.id
                 WHERE dd.id = $1),
                $2,
                'system',
                $3
            )
        `;

        await db.query(query, [documentId, eventType, JSON.stringify({ ...data, document_id: documentId })]);
    }
}

module.exports = DocumentService;
