-- =====================
-- profiles RLS policies
-- =====================
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- ==========================
-- organizations RLS policies
-- ==========================
CREATE POLICY "orgs_select_own"
  ON public.organizations FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "orgs_insert_own"
  ON public.organizations FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "orgs_update_own"
  ON public.organizations FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "orgs_delete_own"
  ON public.organizations FOR DELETE
  USING (created_by = auth.uid());

-- ================================
-- organization_members RLS policies
-- ================================
CREATE POLICY "members_select_own_org"
  ON public.organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id
        AND o.created_by = auth.uid()
    )
  );

-- View with member count
CREATE OR REPLACE VIEW public.organizations_with_member_count AS
SELECT
  o.*,
  COUNT(m.id)::int AS member_count
FROM public.organizations o
LEFT JOIN public.organization_members m ON m.organization_id = o.id
GROUP BY o.id;

-- INSERT and UPDATE handled exclusively by Edge Functions via service-role key
