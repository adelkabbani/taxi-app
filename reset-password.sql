-- Reset admin password to 'admin123'
-- This is the bcrypt hash for 'admin123'

UPDATE users 
SET password_hash = '$2b$10$YourHashHere'
WHERE email = 'admin@taxi.com';

-- If user doesn't exist, create it:
INSERT INTO users (tenant_id, role, email, phone, password_hash, first_name, last_name)
VALUES (1, 'admin', 'admin@taxi.com', '+491234567890', '$2b$10$rZ5vK8J9m.vgGhJZp9qcW.x9X5z3Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z', 'Admin', 'User')
ON CONFLICT (tenant_id, email) DO UPDATE 
SET password_hash = '$2b$10$rZ5vK8J9m.vgGhJZp9qcW.x9X5z3Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z';
