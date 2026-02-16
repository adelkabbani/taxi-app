-- Fleet Command Admin User Setup
-- Run this in psql to create admin login

-- Step 1: Create tenant
INSERT INTO tenants (name, slug, is_active) 
VALUES ('Default Fleet', 'default', true) 
ON CONFLICT (slug) DO NOTHING;

-- Step 2: Create admin user (password = 'admin123')
INSERT INTO users (tenant_id, email, password, first_name, last_name, phone, role, is_active)
SELECT 
    t.id,
    'admin@fleet.com',
    '$2b$10$XP.kK7L6yJ0vW3bI4kN6XeTQZ3k.yN5m5lGf6K5qZ8Zp0F1K2L3M4',
    'Admin',
    'User',
    '+1234567890',
    'admin',
    true
FROM tenants t 
WHERE t.slug = 'default'
ON CONFLICT (email) DO UPDATE 
SET password = '$2b$10$XP.kK7L6yJ0vW3bI4kN6XeTQZ3k.yN5m5lGf6K5qZ8Zp0F1K2L3M4', 
    is_active = true;

-- Step 3: Verify it was created
SELECT 
    id, 
    email, 
    first_name, 
    last_name, 
    role, 
    is_active 
FROM users 
WHERE email = 'admin@fleet.com';
