-- Migration 004: Refactor driver_schedules to use specific dates
-- Description: Switches from recurring weekly schedules to date-specific scheduling for "Tap-to-Toggle" calendar.

-- 1. Clean up existing data (as we are refactoring to a different logic)
TRUNCATE TABLE driver_schedules;

-- 2. Add new columns
ALTER TABLE driver_schedules ADD COLUMN schedule_date DATE NOT NULL;
ALTER TABLE driver_schedules ADD COLUMN shift_type VARCHAR(20); -- 'AM', 'PM', 'FULL', 'CUSTOM'
ALTER TABLE driver_schedules ADD COLUMN is_holiday BOOLEAN DEFAULT false;

-- 3. Remove old columns
ALTER TABLE driver_schedules DROP COLUMN IF EXISTS day_of_week;
ALTER TABLE driver_schedules DROP COLUMN IF EXISTS is_active;

-- 4. Add unique constraint to prevent duplicate dates for the same driver
ALTER TABLE driver_schedules ADD CONSTRAINT unique_driver_schedule_date UNIQUE (driver_id, schedule_date);

-- 5. Add index for faster lookups by date
CREATE INDEX idx_driver_schedules_date ON driver_schedules(schedule_date);

COMMENT ON COLUMN driver_schedules.shift_type IS 'Type of shift: AM (05:00-14:00), PM (14:00-23:00), FULL (05:00-18:00), or CUSTOM';
