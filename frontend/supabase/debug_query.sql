-- DIAGNOSTIC QUERY
-- Run this in Supabase SQL Editor to check your data

-- 1. Check if you have any organizations in the database
SELECT 'Total Organizations:' AS check_name, COUNT(*)::text AS result
FROM organizations
UNION ALL
-- 2. Check your user profile
SELECT 'Your Profile:', 
       COALESCE(
         (SELECT CONCAT('id: ', id::text, ', is_admin: ', is_admin::text, ', email: ', email)
          FROM profiles 
          WHERE id = auth.uid()),
         'NO PROFILE FOUND'
       )
UNION ALL
-- 3. Check organizations you should see (created_by you)
SELECT 'Orgs You Own:', 
       COALESCE(
         (SELECT COUNT(*)::text
          FROM organizations 
          WHERE created_by = auth.uid()),
         '0'
       )
UNION ALL
-- 4. List your organizations
SELECT 'Your Org Names:', 
       COALESCE(
         (SELECT string_agg(name, ', ')
          FROM organizations 
          WHERE created_by = auth.uid()),
         'NONE'
       )
UNION ALL
-- 5. Check RLS policies on organizations table
SELECT 'RLS Enabled on organizations:', 
       (SELECT relrowsecurity::text 
        FROM pg_class 
        WHERE relname = 'organizations')
UNION ALL
-- 6. Check current auth.uid()
SELECT 'Your auth.uid():', 
       COALESCE(auth.uid()::text, 'NULL - NOT AUTHENTICATED');
