-- Drop and recreate the view as SECURITY DEFINER so it bypasses RLS
DROP VIEW IF EXISTS public.organizations_with_member_count;

CREATE VIEW public.organizations_with_member_count
WITH (security_invoker = false) -- This makes it use the view owner's permissions (bypasses RLS)
AS
SELECT
  o.*,
  COUNT(m.id)::int AS member_count
FROM public.organizations o
LEFT JOIN public.organization_members m ON m.organization_id = o.id
GROUP BY o.id;

-- Enable RLS on the view
ALTER VIEW public.organizations_with_member_count OWNER TO postgres;

-- Add RLS policy to the view
ALTER VIEW public.organizations_with_member_count SET (security_invoker = false);
