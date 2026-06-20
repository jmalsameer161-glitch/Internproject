-- Check all users in auth.users table
-- Run this in Supabase SQL Editor to see what accounts exist

SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at,
  raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC;

-- Check profiles table
SELECT 
  id,
  email,
  full_name,
  is_admin,
  created_at
FROM profiles
ORDER BY created_at DESC;
