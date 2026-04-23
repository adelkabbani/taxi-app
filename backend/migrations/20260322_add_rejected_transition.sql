-- Migration: Add 'rejected' as valid transition from 'assigned'
-- Date: 2026-03-22
-- Reason: Drivers need to be able to reject tours assigned to them.
-- The state machine previously only allowed: assigned -> accepted | auto_released | cancelled

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
    
    -- FIXED: Added 'rejected' as valid transition from 'assigned'
    IF OLD.status = 'assigned' AND NEW.status NOT IN ('accepted', 'rejected', 'auto_released', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition from assigned to %', NEW.status;
    END IF;
    
    -- FIXED: Allow 'pending' after rejection (driver rejected, booking needs re-dispatch)
    IF OLD.status = 'rejected' AND NEW.status NOT IN ('assigned', 'cancelled', 'pending') THEN
        RAISE EXCEPTION 'Invalid transition from rejected to %', NEW.status;
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
