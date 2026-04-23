-- Migration to add missing statuses to booking_status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'booking_status' AND e.enumlabel = 'rejected') THEN
        ALTER TYPE booking_status ADD VALUE 'rejected';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'booking_status' AND e.enumlabel = 'expired') THEN
        ALTER TYPE booking_status ADD VALUE 'expired';
    END IF;
END
$$;
