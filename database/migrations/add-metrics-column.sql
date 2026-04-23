-- Add rejected_bookings_count to driver_metrics if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='driver_metrics' AND column_name='rejected_bookings_count') THEN
        ALTER TABLE driver_metrics ADD COLUMN rejected_bookings_count INTEGER DEFAULT 0;
    END IF;
END $$;
