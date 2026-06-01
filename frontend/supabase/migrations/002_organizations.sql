-- Create org type enum
CREATE TYPE public.org_type AS ENUM (
  'school',
  'nonprofit',
  'business',
  'government',
  'startup'
);

-- Create organizations table
CREATE TABLE public.organizations (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text        NOT NULL CHECK (char_length(name) <= 100),
  type             org_type    NOT NULL,
  school_district  text,
  created_by       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_district_required
    CHECK (type != 'school' OR school_district IS NOT NULL)
);

CREATE INDEX idx_organizations_created_by ON public.organizations(created_by);
CREATE INDEX idx_organizations_created_at ON public.organizations(created_at DESC);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
