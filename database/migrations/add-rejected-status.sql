-- Migration: Add 'rejected' status and create assignment_logs table

-- 1. Add 'rejected' to booking_status enum
-- Note: ALTER TYPE ... ADD VALUE cannot run in a transaction block in some PG versions
-- We use a safe check here
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'booking_status' AND e.enumlabel = 'rejected') THEN
        ALTER TYPE booking_status ADD VALUE 'rejected' AFTER 'cancelled';
    END IF;
END $$;

-- 2. Create assignment_logs table for audit trail
CREATE TABLE IF NOT EXISTS assignment_logs (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL, -- 'assigned', 'accepted', 'rejected', 'timed_out'
    reason TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignment_logs_booking ON assignment_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_assignment_logs_driver ON assignment_logs(driver_id);
