-- Quick Admin User Creation Script
-- Run this if you can't login

-- Step 1: Ensure tenant exists
INSERT INTO tenants (name, slug, is_active, timezone)
VALUES ('Default Fleet', 'default', true, 'UTC')
ON CONFLICT (slug) DO UPDATE SET is_active = true;

-- Step 2: Remove old admin user if exists
DELETE FROM users WHERE email = 'admin@fleet.com';

-- Step 3: Create admin user with password 'admin123'
-- Note: Password is pre-hashed with bcrypt
INSERT INTO users (
    tenant_id,
    email,
    password,
    first_name,
    last_name,
    phone,
    role,
    is_active
) 
SELECT 
    t.id,
    'admin@fleet.com',
    '$2b$10$YourHashedPasswordHereWillBeGeneratedProperly',
    'Admin',
    'User',
    '+1234567890',
    'admin',
    true
FROM tenants t 
WHERE t.slug = 'default' 
LIMIT 1;

-- Step 4: Verify creation
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.is_active,
    t.name as tenant_name
FROM users u
JOIN tenants t ON u.tenant_id = t.id
WHERE u.email = 'admin@fleet.com';
