-- Enable schema changes within a transaction
BEGIN;

-- Add new vehicle types if they don't exist
-- Unfortunately, Postgres ALTER TYPE ... ADD VALUE cannot run inside a transaction block in older versions if used natively, 
-- but from PG 12+ it works with COMMIT/BEGIN splitting or just outside transactions.
COMMIT;
-- We split it here because ENUM modifications sometimes refuse to run in transaction blocks
ALTER TYPE vehicle_type ADD VALUE IF NOT EXISTS 'economy_sedan';
ALTER TYPE vehicle_type ADD VALUE IF NOT EXISTS 'business';
BEGIN;

CREATE TABLE IF NOT EXISTS pricing_rules (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    vehicle_type vehicle_type NOT NULL,
    min_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, vehicle_type)
);

COMMIT;
