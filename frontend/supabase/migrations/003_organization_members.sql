-- Create enums
CREATE TYPE public.member_status AS ENUM ('invited', 'active');
CREATE TYPE public.member_role   AS ENUM ('admin', 'member');

-- Create organization_members table
CREATE TABLE public.organization_members (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id          uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  email            text          NOT NULL CHECK (char_length(email) <= 254),
  status           member_status NOT NULL DEFAULT 'invited',
  role             member_role   NOT NULL DEFAULT 'member',
  invited_at       timestamptz   NOT NULL DEFAULT now(),
  joined_at        timestamptz,
  CONSTRAINT unique_org_email UNIQUE (organization_id, email)
);

CREATE INDEX idx_members_organization_id ON public.organization_members(organization_id);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
