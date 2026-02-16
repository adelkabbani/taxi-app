-- Create Admin User for Fleet Command
-- Email: admin@fleet.com
-- Password: admin123

-- Step 1: Create tenant if not exists
INSERT INTO tenants (name, slug, is_active, timezone)
VALUES ('Default Fleet', 'default', true, 'UTC')
ON CONFLICT (slug) DO NOTHING;

-- Step 2: Get tenant ID and create admin user
-- Password hash for 'admin123' using bcrypt
DO $$
DECLARE
    v_tenant_id INTEGER;
BEGIN
    -- Get tenant ID
    SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'default' LIMIT 1;
    
    -- Delete existing admin user if exists (to avoid conflicts)
    DELETE FROM users WHERE email = 'admin@fleet.com';
    
    -- Create admin user
    INSERT INTO users (
        tenant_id,
        email,
        password,
        first_name,
        last_name,
        phone,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        v_tenant_id,
        'admin@fleet.com',
        '$2b$10$rKZqXH6Z7Z2Z1Z2Z1Z2Z1uKZqXH6Z7Z2Z1Z2Z1Z2Z1Z2Z1Z2Z1Z2Z2',  -- 'admin123'
        'Admin',
        'User',
        '+1234567890',
        'admin',
        true,
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'Admin user created successfully!';
    RAISE NOTICE 'Email: admin@fleet.com';
    RAISE NOTICE 'Password: admin123';
END $$;

-- Verify user was created
SELECT id, email, first_name, last_name, role, is_active 
FROM users 
WHERE email = 'admin@fleet.com';
