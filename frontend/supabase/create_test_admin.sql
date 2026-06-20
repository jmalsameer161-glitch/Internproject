-- Create a test admin user manually in Supabase
-- This bypasses the normal signup flow
-- 
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add User" button
-- 3. Enter:
--    - Email: admin@example.com
--    - Password: Admin123!
--    - Check "Auto Confirm User" (to skip email verification)
-- 4. Click "Create User"
-- 5. Copy the user ID that was created
-- 6. Run this SQL below, replacing YOUR_USER_ID with the actual UUID

-- After creating user in dashboard, run this:
-- Replace 'YOUR_USER_ID' with the actual user ID from step 5
INSERT INTO profiles (id, email, full_name, is_admin)
VALUES (
  'YOUR_USER_ID'::uuid,  -- Replace with actual user ID
  'admin@example.com',
  'Test Admin',
  true
)
ON CONFLICT (id) 
DO UPDATE SET is_admin = true;

-- Then you can sign in with:
-- Email: admin@example.com
-- Password: Admin123!
