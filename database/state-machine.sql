-- State Machine Constraints and Transition Rules
-- Ensures booking lifecycle follows strict rules

-- ============================================
-- VALID STATE TRANSITIONS
-- ============================================

-- Function to validate state transitions
CREATE OR REPLACE FUNCTION validate_booking_state_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow any transition if OLD status is NULL (initial insert)
    IF OLD.status IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Define valid transitions
    IF OLD.status = 'pending' AND NEW.status NOT IN ('assigned', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition from pending to %', NEW.status;
    END IF;
    
    IF OLD.status = 'assigned' AND NEW.status NOT IN ('accepted', 'auto_released', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition from assigned to %', NEW.status;
    END IF;
    
    IF OLD.status = 'accepted' AND NEW.status NOT IN ('arrived', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition from accepted to %', NEW.status;
    END IF;
    
    IF OLD.status = 'arrived' AND NEW.status NOT IN ('waiting_started', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition from arrived to %', NEW.status;
    END IF;
    
    IF OLD.status = 'waiting_started' AND NEW.status NOT IN ('started', 'no_show_requested', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition from waiting_started to %', NEW.status;
    END IF;
    
    IF OLD.status = 'no_show_requested' AND NEW.status NOT IN ('no_show_confirmed', 'started') THEN
        RAISE EXCEPTION 'Invalid transition from no_show_requested to %', NEW.status;
    END IF;
    
    IF OLD.status = 'started' AND NEW.status NOT IN ('completed') THEN
        RAISE EXCEPTION 'Invalid transition from started to %', NEW.status;
    END IF;
    
    -- Terminal states cannot transition
    IF OLD.status IN ('completed', 'cancelled', 'no_show_confirmed', 'auto_released') THEN
        RAISE EXCEPTION 'Cannot transition from terminal state %', OLD.status;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply state machine validation trigger
CREATE TRIGGER enforce_booking_state_machine
    BEFORE UPDATE OF status ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION validate_booking_state_transition();

-- ============================================
-- AUTOMATIC TIMESTAMP UPDATES
-- ============================================

-- Function to auto-update timestamps based on status changes
CREATE OR REPLACE FUNCTION update_booking_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'assigned' AND OLD.status != 'assigned' THEN
        NEW.assigned_at = NOW();
    END IF;
    
    IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
        NEW.accepted_at = NOW();
    END IF;
    
    IF NEW.status = 'arrived' AND OLD.status != 'arrived' THEN
        NEW.arrived_at = NOW();
    END IF;
    
    IF NEW.status = 'waiting_started' AND OLD.status != 'waiting_started' THEN
        NEW.waiting_started_at = NOW();
    END IF;
    
    IF NEW.status = 'started' AND OLD.status != 'started' THEN
        NEW.started_at = NOW();
    END IF;
    
    IF NEW.status IN ('completed', 'cancelled', 'no_show_confirmed') AND OLD.status NOT IN ('completed', 'cancelled', 'no_show_confirmed') THEN
        NEW.completed_at = NOW();
    END IF;
    
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        NEW.cancelled_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_update_booking_timestamps
    BEFORE UPDATE OF status ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_booking_timestamps();

-- ============================================
-- AUTOMATIC TIMELINE LOGGING
-- ============================================

-- Function to log all booking state changes to timeline
CREATE OR REPLACE FUNCTION log_booking_state_change()
RETURNS TRIGGER AS $$
DECLARE
    event_name VARCHAR(50);
    actor_type event_actor;
    actor_id_val INTEGER;
BEGIN
    -- Only log if status actually changed
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        -- Determine event name
        event_name := 'status_changed_to_' || NEW.status;
        
        -- Determine actor (system by default, can be overridden by application)
        actor_type := 'system';
        actor_id_val := NULL;
        
        -- Insert timeline event
        INSERT INTO booking_timeline (booking_id, event_type, actor_type, actor_id, details)
        VALUES (
            NEW.id,
            event_name,
            actor_type,
            actor_id_val,
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'driver_id', NEW.driver_id,
                'vehicle_id', NEW.vehicle_id
            )
        );
        
        -- Also log to immutable event_logs
        INSERT INTO event_logs (tenant_id, booking_id, event_type, actor_type, actor_id, data)
        VALUES (
            NEW.tenant_id,
            NEW.id,
            event_name,
            actor_type,
            actor_id_val,
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'timestamp', NOW()
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_booking_state_changes
    AFTER UPDATE OF status ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION log_booking_state_change();

-- ============================================
-- TIMEOUT MANAGEMENT
-- ============================================

-- View for bookings that should be auto-released (driver timeout)
CREATE OR REPLACE VIEW bookings_pending_auto_release AS
SELECT 
    b.*,
    EXTRACT(EPOCH FROM (NOW() - b.assigned_at)) / 60 AS minutes_since_assigned
FROM bookings b
WHERE b.status = 'assigned'
  AND b.assigned_at IS NOT NULL
  AND b.assigned_at < NOW() - INTERVAL '90 seconds'; -- Configurable timeout

-- View for bookings eligible for no-show (waiting timeout)
CREATE OR REPLACE VIEW bookings_no_show_eligible AS
SELECT 
    b.*,
    EXTRACT(EPOCH FROM (NOW() - b.arrived_at)) / 60 AS minutes_since_arrived,
    COALESCE(ppr.free_wait_minutes, 10) AS free_wait_minutes
FROM bookings b
LEFT JOIN partner_pricing_rules ppr ON b.partner_id = ppr.partner_id
WHERE b.status IN ('arrived', 'waiting_started')
  AND b.arrived_at IS NOT NULL
  AND b.arrived_at < NOW() - INTERVAL '1 minute' * COALESCE(ppr.free_wait_minutes, 10);

-- ============================================
-- MONEY EVENT TRIGGERS
-- ============================================

-- Function to calculate and apply waiting fees
CREATE OR REPLACE FUNCTION calculate_waiting_fee(booking_id_param INTEGER)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    booking_record RECORD;
    free_wait_mins INTEGER;
    wait_fee_per_min DECIMAL(5, 2);
    total_wait_mins DECIMAL(10, 2);
    billable_wait_mins DECIMAL(10, 2);
    waiting_fee_amount DECIMAL(10, 2);
BEGIN
    -- Get booking with partner pricing rules
    SELECT 
        b.*,
        COALESCE(ppr.free_wait_minutes, 10) AS free_wait_minutes,
        COALESCE(ppr.waiting_fee_per_minute, 0.00) AS waiting_fee_per_minute
    INTO booking_record
    FROM bookings b
    LEFT JOIN partner_pricing_rules ppr ON b.partner_id = ppr.partner_id
    WHERE b.id = booking_id_param;
    
    IF NOT FOUND THEN
        RETURN 0.00;
    END IF;
    
    -- Calculate total wait time
    IF booking_record.arrived_at IS NULL THEN
        RETURN 0.00;
    END IF;
    
    total_wait_mins := EXTRACT(EPOCH FROM (NOW() - booking_record.arrived_at)) / 60;
    free_wait_mins := booking_record.free_wait_minutes;
    wait_fee_per_min := booking_record.waiting_fee_per_minute;
    
    -- Calculate billable minutes
    billable_wait_mins := GREATEST(0, total_wait_mins - free_wait_mins);
    
    -- Calculate fee
    waiting_fee_amount := billable_wait_mins * wait_fee_per_min;
    
    RETURN ROUND(waiting_fee_amount, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to apply no-show fee
CREATE OR REPLACE FUNCTION get_no_show_fee(booking_id_param INTEGER)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    booking_record RECORD;
    no_show_fee_amount DECIMAL(10, 2);
BEGIN
    -- Get booking with partner pricing rules
    SELECT 
        b.*,
        COALESCE(ppr.cancellation_fee, 15.00) AS cancellation_fee
    INTO booking_record
    FROM bookings b
    LEFT JOIN partner_pricing_rules ppr ON b.partner_id = ppr.partner_id
    WHERE b.id = booking_id_param;
    
    IF NOT FOUND THEN
        RETURN 0.00;
    END IF;
    
    no_show_fee_amount := booking_record.cancellation_fee;
    
    RETURN ROUND(no_show_fee_amount, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER VIEWS FOR ADMIN DASHBOARD
-- ============================================

-- Active bookings with driver info
CREATE OR REPLACE VIEW active_bookings_with_details AS
SELECT 
    b.*,
    u_passenger.first_name || ' ' || u_passenger.last_name AS passenger_name,
    u_passenger.phone AS passenger_phone,
    u_driver.first_name || ' ' || u_driver.last_name AS driver_name,
    u_driver.phone AS driver_phone,
    d.availability AS driver_availability,
    d.current_lat AS driver_lat,
    d.current_lng AS driver_lng,
    d.location_updated_at AS driver_location_updated_at,
    v.license_plate,
    v.vehicle_type,
    p.name AS partner_name
FROM bookings b
LEFT JOIN users u_passenger ON b.passenger_id = u_passenger.id
LEFT JOIN drivers d ON b.driver_id = d.id
LEFT JOIN users u_driver ON d.user_id = u_driver.id
LEFT JOIN vehicles v ON b.vehicle_id = v.id
LEFT JOIN partners p ON b.partner_id = p.id
WHERE b.status NOT IN ('completed', 'cancelled', 'no_show_confirmed');

-- Driver availability for dispatch
CREATE OR REPLACE VIEW available_drivers_with_capabilities AS
SELECT 
    d.id AS driver_id,
    d.current_lat,
    d.current_lng,
    d.location_updated_at,
    CASE 
        WHEN d.location_updated_at > NOW() - INTERVAL '60 seconds' THEN false
        ELSE true
    END AS is_stale,
    u.first_name || ' ' || u.last_name AS driver_name,
    u.phone AS driver_phone,
    v.id AS vehicle_id,
    v.vehicle_type,
    v.license_plate,
    vc.luggage_capacity,
    vc.passenger_capacity,
    vc.has_child_seat,
    vc.is_accessible,
    vc.has_airport_permit,
    dc.languages,
    dm.acceptance_rate
FROM drivers d
JOIN users u ON d.user_id = u.id
LEFT JOIN vehicles v ON d.vehicle_id = v.id
LEFT JOIN vehicle_capabilities vc ON v.id = vc.vehicle_id
LEFT JOIN driver_capabilities dc ON d.id = dc.driver_id
LEFT JOIN driver_metrics dm ON d.id = dm.driver_id
WHERE d.availability = 'available'
  AND d.location_updated_at > NOW() - INTERVAL '60 seconds'; -- Only non-stale drivers

COMMENT ON VIEW available_drivers_with_capabilities IS 'Drivers available for dispatch with all capabilities and non-stale locations';
