-- Migration 003: Auto-Assignment System
-- Description: Adds tables and columns for the automated dispatch engine.

-- 1. Update bookings table for assignment tracking
ALTER TABLE bookings ADD COLUMN assignment_method VARCHAR(20) DEFAULT 'manual' CHECK (assignment_method IN ('manual', 'auto', 'auto_cascade', 'auto_failed'));
ALTER TABLE bookings ADD COLUMN auto_assignment_attempts INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN last_assignment_attempt TIMESTAMP;
ALTER TABLE bookings ADD COLUMN assignment_failed_reason TEXT;
ALTER TABLE bookings ADD COLUMN estimated_duration_minutes INTEGER DEFAULT 60;
ALTER TABLE bookings ADD COLUMN current_assignment_id INTEGER;

-- 2. Add driver priority and type to drivers table
ALTER TABLE drivers ADD COLUMN driver_type VARCHAR(20) DEFAULT 'employee' CHECK (driver_type IN ('employee', 'contractor', 'partner'));
ALTER TABLE drivers ADD COLUMN priority_level INTEGER DEFAULT 1; -- 1 (Highest) to 5 (Lowest)

CREATE INDEX idx_drivers_priority_availability ON drivers(priority_level, availability);

-- 3. Create driver_schedules table
CREATE TABLE driver_schedules (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    schedule_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_holiday BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(driver_id, schedule_date)
);

CREATE INDEX idx_driver_schedules_date ON driver_schedules(schedule_date);
CREATE INDEX idx_driver_schedules_driver_date ON driver_schedules(driver_id, schedule_date);

-- 4. Create assignment_attempts table (Tracking for the Cascade)
CREATE TABLE assignment_attempts (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE SET NULL,
    assignment_method VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    rejection_reason TEXT,
    is_current_assignment BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    responded_at TIMESTAMP
);

CREATE INDEX idx_assignment_attempts_booking ON assignment_attempts(booking_id);
CREATE INDEX idx_assignment_attempts_driver ON assignment_attempts(driver_id);

-- 5. Create assignment_round_robin table (Fair Distribution Tracking)
CREATE TABLE assignment_round_robin (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    last_assigned_driver_id INTEGER REFERENCES drivers(id),
    assignment_count INTEGER DEFAULT 0,
    last_assigned_at TIMESTAMP DEFAULT NOW(),
    last_reset_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id)
);

-- Trigger to update updated_at on driver_schedules
CREATE TRIGGER update_driver_schedules_updated_at BEFORE UPDATE ON driver_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE driver_schedules IS 'Weekly working hours and holidays for drivers used by auto-assignment engine';
COMMENT ON TABLE assignment_attempts IS 'History of driver assignments and rejections for a specific booking';
