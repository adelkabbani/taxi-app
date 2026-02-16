-- Migration: Add passenger contact fields for API/partner bookings
-- These fields store passenger info when no user account exists (e.g., Booking.com transfers)

-- Add passenger_name for storing name from external bookings
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS passenger_name VARCHAR(255);

-- Add passenger_phone for storing phone from external bookings  
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS passenger_phone VARCHAR(50);

-- Add source field to track booking origin (manual, api, booking.com, etc.)
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';

-- Add external_reference for storing the partner's booking ID
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS external_reference VARCHAR(255);

-- Create index for external reference lookups
CREATE INDEX IF NOT EXISTS idx_bookings_external_ref ON bookings(external_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_source ON bookings(source);

-- Update existing bookings to set source based on partner
UPDATE bookings 
SET source = CASE 
    WHEN partner_id IS NOT NULL THEN 'partner'
    ELSE 'manual'
END
WHERE source IS NULL OR source = 'manual';

COMMENT ON COLUMN bookings.passenger_name IS 'Passenger name for API/partner bookings where no user account exists';
COMMENT ON COLUMN bookings.passenger_phone IS 'Passenger phone for API/partner bookings where no user account exists';
COMMENT ON COLUMN bookings.source IS 'Booking origin: manual, api, booking.com, partner, phone, app';
COMMENT ON COLUMN bookings.external_reference IS 'External booking reference from partner systems';
