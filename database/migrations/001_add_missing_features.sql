-- Migration: Add Missing Features and Enhancements
-- Version: 001
-- Date: 2026-02-08
-- Description: Adds driver documents, ratings, payment transactions, and notification tracking

-- ============================================
-- DRIVER DOCUMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS driver_documents (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- 'cv', 'license', 'certificate', 'insurance', 'work_experience'
    file_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_size_bytes INTEGER,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP,
    verified_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    expiry_date DATE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'expired'
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_document_type CHECK (document_type IN ('cv', 'license', 'certificate', 'insurance', 'work_experience')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_driver_documents_driver ON driver_documents(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_status ON driver_documents(status);
CREATE INDEX IF NOT EXISTS idx_driver_documents_type ON driver_documents(document_type);

COMMENT ON TABLE driver_documents IS 'Stores driver uploaded documents (CV, licenses, certificates) with verification status';

-- ============================================
-- DRIVER RATINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS driver_ratings (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    passenger_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT one_rating_per_booking UNIQUE(booking_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_ratings_driver ON driver_ratings(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_ratings_booking ON driver_ratings(booking_id);
CREATE INDEX IF NOT EXISTS idx_driver_ratings_created ON driver_ratings(created_at);

COMMENT ON TABLE driver_ratings IS 'Passenger ratings for drivers after completed trips';

-- ============================================
-- PAYMENT TRANSACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS payment_transactions (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transaction_id VARCHAR(255) UNIQUE NOT NULL, -- External payment gateway ID
    payment_method payment_method NOT NULL,
    payment_gateway VARCHAR(50), -- 'stripe', 'paypal', 'cash', 'internal'
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'refunded'
    gateway_response JSONB,
    processed_at TIMESTAMP,
    refunded_at TIMESTAMP,
    refund_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    CONSTRAINT positive_amount CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_booking ON payment_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice ON payment_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant ON payment_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created ON payment_transactions(created_at);

COMMENT ON TABLE payment_transactions IS 'Payment transaction records from external gateways (Stripe, PayPal) and cash';

-- ============================================
-- NOTIFICATION DELIVERY LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS notification_delivery_logs (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    provider VARCHAR(50), -- 'twilio', 'sendgrid', 'firebase'
    provider_message_id VARCHAR(255),
    delivery_status VARCHAR(20), -- 'queued', 'sent', 'delivered', 'failed', 'bounced'
    error_message TEXT,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_delivery_status CHECK (delivery_status IN ('queued', 'sent', 'delivered', 'failed', 'bounced'))
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_notification ON notification_delivery_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_delivery_logs(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_provider ON notification_delivery_logs(provider);

COMMENT ON TABLE notification_delivery_logs IS 'Tracks delivery status of notifications through external providers';

-- ============================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================

-- Add assignment tracking to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS assignment_method VARCHAR(20) DEFAULT 'manual';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS auto_assignment_attempted BOOLEAN DEFAULT false;

COMMENT ON COLUMN bookings.assignment_method IS 'How driver was assigned: manual, auto, partner_api';
COMMENT ON COLUMN bookings.auto_assignment_attempted IS 'Whether auto-assignment was attempted for this booking';

-- Add rating fields to drivers
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3, 2) DEFAULT 0.00;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;

COMMENT ON COLUMN drivers.average_rating IS 'Average passenger rating (1-5 stars)';
COMMENT ON COLUMN drivers.total_ratings IS 'Total number of ratings received';

-- Add constraints to ensure valid ratings (drop first if exists to avoid errors on re-run)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_average_rating') THEN
        ALTER TABLE drivers DROP CONSTRAINT valid_average_rating;
    END IF;
END $$;

ALTER TABLE drivers ADD CONSTRAINT valid_average_rating 
    CHECK (average_rating >= 0 AND average_rating <= 5);

-- ============================================
-- DATABASE FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to automatically update driver rating when a new rating is submitted
CREATE OR REPLACE FUNCTION update_driver_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE drivers
    SET 
        average_rating = (
            SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0.00)
            FROM driver_ratings
            WHERE driver_id = NEW.driver_id
        ),
        total_ratings = (
            SELECT COUNT(*)
            FROM driver_ratings
            WHERE driver_id = NEW.driver_id
        ),
        updated_at = NOW()
    WHERE id = NEW.driver_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for driver rating updates
DROP TRIGGER IF EXISTS update_driver_rating_trigger ON driver_ratings;
CREATE TRIGGER update_driver_rating_trigger
    AFTER INSERT OR UPDATE ON driver_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_driver_rating();

-- Function to check for expired documents
CREATE OR REPLACE FUNCTION check_expired_documents()
RETURNS VOID AS $$
BEGIN
    UPDATE driver_documents
    SET status = 'expired'
    WHERE status = 'approved'
        AND expiry_date IS NOT NULL
        AND expiry_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_expired_documents IS 'Updates status of documents that have passed their expiry date - should be run daily via cron';

-- Function to log payment status changes
CREATE OR REPLACE FUNCTION log_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status changed
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO event_logs (tenant_id, booking_id, event_type, actor_type, data)
        VALUES (
            NEW.tenant_id,
            NEW.booking_id,
            'payment_status_changed',
            'system',
            jsonb_build_object(
                'transaction_id', NEW.transaction_id,
                'old_status', OLD.status,
                'new_status', NEW.status,
                'amount', NEW.amount,
                'payment_gateway', NEW.payment_gateway,
                'timestamp', NOW()
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment status logging
DROP TRIGGER IF EXISTS log_payment_status_trigger ON payment_transactions;
CREATE TRIGGER log_payment_status_trigger
    AFTER UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION log_payment_status_change();

-- ============================================
-- ENHANCED VIEWS FOR ANALYTICS
-- ============================================

-- View: Driver Performance Summary
CREATE OR REPLACE VIEW driver_performance_summary AS
SELECT 
    d.id AS driver_id,
    u.first_name || ' ' || u.last_name AS driver_name,
    u.phone AS driver_phone,
    d.average_rating,
    d.total_ratings,
    dm.acceptance_rate,
    dm.total_bookings,
    dm.accepted_bookings,
    dm.rejected_bookings,
    dm.cancelled_bookings,
    dm.late_arrivals,
    dm.no_shows,
    d.availability,
    d.shift_started_at,
    COUNT(DISTINCT dd.id) FILTER (WHERE dd.status = 'pending') AS pending_documents
FROM drivers d
JOIN users u ON d.user_id = u.id
LEFT JOIN driver_metrics dm ON d.id = dm.driver_id
LEFT JOIN driver_documents dd ON d.id = dd.driver_id
GROUP BY d.id, u.first_name, u.last_name, u.phone, d.average_rating, d.total_ratings, 
         dm.acceptance_rate, dm.total_bookings, dm.accepted_bookings, dm.rejected_bookings,
         dm.cancelled_bookings, dm.late_arrivals, dm.no_shows, d.availability, d.shift_started_at;

COMMENT ON VIEW driver_performance_summary IS 'Comprehensive driver performance metrics for admin dashboard';

-- View: Payment Analytics
CREATE OR REPLACE VIEW payment_analytics AS
SELECT 
    DATE(pt.created_at) AS payment_date,
    pt.payment_method,
    pt.payment_gateway,
    pt.status,
    COUNT(*) AS transaction_count,
    SUM(pt.amount) AS total_amount,
    AVG(pt.amount) AS average_amount,
    COUNT(*) FILTER (WHERE pt.status = 'completed') AS successful_transactions,
    COUNT(*) FILTER (WHERE pt.status = 'failed') AS failed_transactions,
    COUNT(*) FILTER (WHERE pt.status = 'refunded') AS refunded_transactions
FROM payment_transactions pt
GROUP BY DATE(pt.created_at), pt.payment_method, pt.payment_gateway, pt.status;

COMMENT ON VIEW payment_analytics IS 'Daily payment analytics grouped by method and gateway';

-- View: Document Verification Queue
CREATE OR REPLACE VIEW document_verification_queue AS
SELECT 
    dd.id AS document_id,
    dd.driver_id,
    u.first_name || ' ' || u.last_name AS driver_name,
    u.phone AS driver_phone,
    dd.document_type,
    dd.file_name,
    dd.uploaded_at,
    dd.expiry_date,
    dd.status,
    CASE 
        WHEN dd.expiry_date IS NOT NULL AND dd.expiry_date < CURRENT_DATE THEN true
        ELSE false
    END AS is_expired,
    EXTRACT(DAY FROM NOW() - dd.uploaded_at) AS days_pending
FROM driver_documents dd
JOIN drivers d ON dd.driver_id = d.id
JOIN users u ON d.user_id = u.id
WHERE dd.status = 'pending'
ORDER BY dd.uploaded_at ASC;

COMMENT ON VIEW document_verification_queue IS 'All pending document verifications sorted by upload date';

-- ============================================
-- DATA INTEGRITY CHECKS
-- ============================================

-- Ensure foreign key constraints are properly set with CASCADE delete
-- Recreate booking_timeline foreign key with CASCADE
ALTER TABLE booking_timeline DROP CONSTRAINT IF EXISTS booking_timeline_booking_id_fkey;
ALTER TABLE booking_timeline ADD CONSTRAINT booking_timeline_booking_id_fkey 
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

-- Recreate proof_assets foreign key with CASCADE
ALTER TABLE proof_assets DROP CONSTRAINT IF EXISTS proof_assets_booking_id_fkey;
ALTER TABLE proof_assets ADD CONSTRAINT proof_assets_booking_id_fkey 
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Query to verify all new tables were created
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name IN ('driver_documents', 'driver_ratings', 'payment_transactions', 'notification_delivery_logs');
    
    IF table_count = 4 THEN
        RAISE NOTICE 'SUCCESS: All 4 new tables created successfully';
    ELSE
        RAISE WARNING 'WARNING: Only % of 4 tables were created', table_count;
    END IF;
END $$;

-- Query to verify new columns were added
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'bookings' AND column_name = 'assignment_method') THEN
        RAISE NOTICE 'SUCCESS: bookings.assignment_method column added';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'drivers' AND column_name = 'average_rating') THEN
        RAISE NOTICE 'SUCCESS: drivers.average_rating column added';
    END IF;
END $$;

COMMENT ON SCHEMA public IS 'Fleet Command & Driver Dispatch Portal - Enhanced with document management, ratings, and payment tracking';
