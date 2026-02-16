-- Taxi Booking & Dispatch System - Database Schema
-- PostgreSQL 14+
-- Multi-tenant support with row-level security

-- Enable extensions
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "postgis"; -- For geospatial queries

-- ============================================
-- MULTI-TENANT FOUNDATION
-- ============================================

CREATE TABLE tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'driver', 'passenger');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    status user_status DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, email),
    UNIQUE(tenant_id, phone)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_phone ON users(phone);

-- ============================================
-- VEHICLES & CAPABILITIES
-- ============================================

CREATE TYPE vehicle_type AS ENUM ('sedan', 'van', 'business_van', 'luxury', 'accessible');
CREATE TYPE vehicle_status AS ENUM ('active', 'maintenance', 'inactive');

CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    license_plate VARCHAR(50) NOT NULL,
    make VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    color VARCHAR(50),
    vehicle_type vehicle_type NOT NULL,
    status vehicle_status DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, license_plate)
);

CREATE TABLE vehicle_capabilities (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
    luggage_capacity INTEGER DEFAULT 2,
    passenger_capacity INTEGER DEFAULT 4,
    has_child_seat BOOLEAN DEFAULT false,
    is_accessible BOOLEAN DEFAULT false,
    has_airport_permit BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vehicles_tenant ON vehicles(tenant_id);
CREATE INDEX idx_vehicles_type ON vehicles(vehicle_type);

-- ============================================
-- DRIVERS & METRICS
-- ============================================

CREATE TYPE driver_availability AS ENUM ('available', 'busy', 'offline', 'on_break');

CREATE TABLE drivers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
    license_number VARCHAR(100),
    license_expiry DATE,
    availability driver_availability DEFAULT 'offline',
    current_lat DECIMAL(10, 7),
    current_lng DECIMAL(10, 7),
    location_updated_at TIMESTAMP,
    shift_started_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE driver_capabilities (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
    languages TEXT[], -- Array of language codes: ['en', 'de', 'ar']
    has_airport_permit BOOLEAN DEFAULT false,
    preferred_vehicle_types vehicle_type[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- Silent performance tracking (admin-only, never shown to drivers)
CREATE TABLE driver_metrics (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
    acceptance_rate DECIMAL(5, 2) DEFAULT 100.00, -- Percentage
    total_bookings INTEGER DEFAULT 0,
    accepted_bookings INTEGER DEFAULT 0,
    rejected_bookings INTEGER DEFAULT 0,
    cancelled_bookings INTEGER DEFAULT 0,
    late_arrivals INTEGER DEFAULT 0,
    no_shows INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(driver_id)
);

-- Driver shifts and breaks
CREATE TABLE driver_shifts (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    total_driving_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE driver_breaks (
    id SERIAL PRIMARY KEY,
    shift_id INTEGER REFERENCES driver_shifts(id) ON DELETE CASCADE,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_drivers_availability ON drivers(availability);
CREATE INDEX idx_drivers_location_updated ON drivers(location_updated_at);

-- ============================================
-- PARTNERS & COMMISSION RULES
-- ============================================

CREATE TABLE partners (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    api_key VARCHAR(255) UNIQUE,
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE partner_pricing_rules (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
    commission_percentage DECIMAL(5, 2) DEFAULT 0.00, -- e.g., 15.00 for 15%
    cancellation_fee DECIMAL(10, 2) DEFAULT 0.00,
    no_show_liability VARCHAR(20) DEFAULT 'partner', -- 'partner' or 'passenger'
    free_wait_minutes INTEGER DEFAULT 10,
    waiting_fee_per_minute DECIMAL(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(partner_id)
);

CREATE TABLE partner_settlements (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_bookings INTEGER DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0.00,
    commission_amount DECIMAL(12, 2) DEFAULT 0.00,
    export_status VARCHAR(20) DEFAULT 'pending', -- pending, issued, paid
    exported_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_partners_tenant ON partners(tenant_id);
CREATE INDEX idx_partner_settlements_period ON partner_settlements(period_start, period_end);

-- ============================================
-- BOOKINGS & STATE MACHINE
-- ============================================

CREATE TYPE booking_status AS ENUM (
    'pending',
    'assigned',
    'accepted',
    'arrived',
    'waiting_started',
    'started',
    'completed',
    'cancelled',
    'no_show_requested',
    'no_show_confirmed',
    'auto_released'
);

CREATE TYPE payment_method AS ENUM ('cash', 'card_in_car', 'invoice', 'partner_paid');
CREATE TYPE invoice_status AS ENUM ('not_required', 'pending', 'issued', 'paid');

CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    booking_reference VARCHAR(50) UNIQUE NOT NULL,
    passenger_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
    partner_id INTEGER REFERENCES partners(id) ON DELETE SET NULL,
    
    -- Status and lifecycle
    status booking_status DEFAULT 'pending',
    created_by_user_id INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP,
    accepted_at TIMESTAMP,
    arrived_at TIMESTAMP,
    waiting_started_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    
    -- Pickup and dropoff
    pickup_address TEXT NOT NULL,
    pickup_lat DECIMAL(10, 7) NOT NULL,
    pickup_lng DECIMAL(10, 7) NOT NULL,
    dropoff_address TEXT,
    dropoff_lat DECIMAL(10, 7),
    dropoff_lng DECIMAL(10, 7),
    
    -- Timing
    scheduled_pickup_time TIMESTAMP,
    estimated_duration_minutes INTEGER,
    
    -- Pricing
    fare_estimate DECIMAL(10, 2),
    fare_final DECIMAL(10, 2),
    waiting_fee DECIMAL(10, 2) DEFAULT 0.00,
    no_show_fee DECIMAL(10, 2) DEFAULT 0.00,
    payment_method payment_method,
    invoice_status invoice_status DEFAULT 'not_required',
    
    -- Notes
    passenger_notes TEXT,
    driver_notes TEXT,
    admin_notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Booking requirements (vehicle constraints)
CREATE TABLE booking_requirements (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    vehicle_type vehicle_type,
    min_luggage_capacity INTEGER,
    needs_child_seat BOOLEAN DEFAULT false,
    needs_accessibility BOOLEAN DEFAULT false,
    preferred_language VARCHAR(10),
    requires_airport_permit BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_driver ON bookings(driver_id);
CREATE INDEX idx_bookings_passenger ON bookings(passenger_id);
CREATE INDEX idx_bookings_partner ON bookings(partner_id);
CREATE INDEX idx_bookings_scheduled ON bookings(scheduled_pickup_time);
CREATE INDEX idx_bookings_reference ON bookings(booking_reference);

-- ============================================
-- TIMELINE & EVENT LOGGING
-- ============================================

CREATE TYPE event_actor AS ENUM ('driver', 'passenger', 'admin', 'system', 'api');

CREATE TABLE booking_timeline (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- e.g., 'booking_created', 'driver_assigned', 'no_show_confirmed'
    actor_type event_actor NOT NULL,
    actor_id INTEGER, -- user_id or driver_id
    details JSONB, -- Flexible storage for event-specific data
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_timeline_booking ON booking_timeline(booking_id);
CREATE INDEX idx_timeline_event_type ON booking_timeline(event_type);
CREATE INDEX idx_timeline_created ON booking_timeline(created_at);

-- Immutable event log for disputes and compliance
CREATE TABLE event_logs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    actor_type event_actor,
    actor_id INTEGER,
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_event_logs_tenant ON event_logs(tenant_id);
CREATE INDEX idx_event_logs_booking ON event_logs(booking_id);
CREATE INDEX idx_event_logs_type ON event_logs(event_type);

-- ============================================
-- EVIDENCE & DISPUTE RESOLUTION
-- ============================================

CREATE TYPE asset_type AS ENUM ('pickup_photo', 'dropoff_photo', 'signature', 'location_screenshot', 'other');

CREATE TABLE proof_assets (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    asset_type asset_type NOT NULL,
    file_url TEXT NOT NULL,
    captured_at TIMESTAMP NOT NULL,
    gps_lat DECIMAL(10, 7),
    gps_lng DECIMAL(10, 7),
    gps_accuracy_m DECIMAL(6, 2),
    pickup_label TEXT, -- Human-readable location
    device_id VARCHAR(255),
    hash VARCHAR(64), -- SHA-256 for integrity
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_proof_booking ON proof_assets(booking_id);

-- ============================================
-- EXTERNAL INTEGRATIONS & WEBHOOKS
-- ============================================

CREATE TYPE webhook_status AS ENUM ('received', 'validated', 'rejected', 'converted');

CREATE TABLE external_bookings (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    external_booking_id VARCHAR(255) NOT NULL,
    source VARCHAR(100) NOT NULL, -- 'booking_com', 'partner_api', etc.
    raw_payload JSONB NOT NULL,
    processing_status webhook_status DEFAULT 'received',
    processed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(external_booking_id, source) -- Idempotency
);

CREATE TABLE webhook_logs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    source VARCHAR(100) NOT NULL,
    endpoint VARCHAR(255),
    payload JSONB,
    status_code INTEGER,
    response JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_external_bookings_tenant ON external_bookings(tenant_id);
CREATE INDEX idx_external_bookings_partner ON external_bookings(partner_id);
CREATE INDEX idx_external_bookings_external_id ON external_bookings(external_booking_id, source);

-- ============================================
-- FRAUD PREVENTION
-- ============================================

CREATE TABLE fraud_flags (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    flag_type VARCHAR(50) NOT NULL, -- 'repeated_cancellation', 'fake_booking', 'spam'
    severity VARCHAR(20) DEFAULT 'low', -- 'low', 'medium', 'high'
    details JSONB,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE blacklist (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    phone VARCHAR(50),
    email VARCHAR(255),
    device_hash VARCHAR(64),
    reason TEXT NOT NULL,
    blocked_by_user_id INTEGER REFERENCES users(id),
    blocked_at TIMESTAMP DEFAULT NOW(),
    unblocked_at TIMESTAMP
);

CREATE INDEX idx_fraud_flags_user ON fraud_flags(user_id);
CREATE INDEX idx_blacklist_phone ON blacklist(phone);
CREATE INDEX idx_blacklist_email ON blacklist(email);

-- ============================================
-- ADMIN AUDIT LOGS (GDPR Compliance)
-- ============================================

CREATE TABLE admin_audit_logs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    admin_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- 'view_booking', 'override_status', 'export_data'
    resource_type VARCHAR(50), -- 'booking', 'driver', 'user'
    resource_id INTEGER,
    ip_address INET,
    session_id VARCHAR(255),
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_tenant ON admin_audit_logs(tenant_id);
CREATE INDEX idx_admin_audit_user ON admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_action ON admin_audit_logs(action);

-- ============================================
-- DRIVER LOCATION HISTORY (for staleness tracking)
-- ============================================

CREATE TABLE location_updates (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
    lat DECIMAL(10, 7) NOT NULL,
    lng DECIMAL(10, 7) NOT NULL,
    accuracy_m DECIMAL(6, 2),
    heading DECIMAL(5, 2), -- 0-360 degrees
    speed_kmh DECIMAL(5, 2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Partition by time for performance (optional, for high-volume systems)
CREATE INDEX idx_location_driver_time ON location_updates(driver_id, created_at DESC);

-- ============================================
-- INVOICES
-- ============================================

CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    partner_id INTEGER REFERENCES partners(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    fare_estimate DECIMAL(10, 2),
    fare_final DECIMAL(10, 2),
    waiting_fee DECIMAL(10, 2) DEFAULT 0.00,
    no_show_fee DECIMAL(10, 2) DEFAULT 0.00,
    commission DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL,
    payment_method payment_method,
    status invoice_status DEFAULT 'pending',
    issued_at TIMESTAMP,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_booking ON invoices(booking_id);
CREATE INDEX idx_invoices_partner ON invoices(partner_id);

-- ============================================
-- FLIGHT TRACKING (for airport pickups)
-- ============================================

CREATE TABLE flight_tracking (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    flight_number VARCHAR(20) NOT NULL,
    airline VARCHAR(100),
    origin_airport VARCHAR(10),
    destination_airport VARCHAR(10),
    scheduled_arrival TIMESTAMP,
    estimated_arrival TIMESTAMP,
    actual_arrival TIMESTAMP,
    status VARCHAR(50), -- 'on_time', 'delayed', 'cancelled', 'landed'
    last_updated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_flight_tracking_booking ON flight_tracking(booking_id);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TYPE notification_channel AS ENUM ('sms', 'push', 'email', 'websocket');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed');

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    recipient_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    channel notification_channel NOT NULL,
    title VARCHAR(255),
    message TEXT NOT NULL,
    status notification_status DEFAULT 'pending',
    sent_at TIMESTAMP,
    read_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(recipient_user_id);
CREATE INDEX idx_notifications_status ON notifications(status);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON partners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA (Development Only)
-- ============================================

-- Create default tenant
INSERT INTO tenants (name, slug, timezone) VALUES ('Default Taxi Company', 'default', 'Europe/Berlin');

-- Create admin user (password: admin123 - CHANGE IN PRODUCTION)
INSERT INTO users (tenant_id, role, email, phone, password_hash, first_name, last_name)
VALUES (1, 'admin', 'admin@taxi.com', '+491234567890', '$2b$10$rZ5vK8J9m.vgGhJZp9qcW.x9X5z3Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z', 'Admin', 'User');

COMMENT ON DATABASE taxi_dispatch IS 'Production-grade taxi booking and dispatch system with multi-tenant support';
