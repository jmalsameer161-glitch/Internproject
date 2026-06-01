# Design Document

## Overview

The Admin Organization Dashboard is a single-page application (SPA) built with React 18 + TypeScript, using Supabase as the complete backend (Postgres database, Auth, Edge Functions, and Row-Level Security). The frontend communicates with Supabase directly for all read operations (via the anon key + RLS) and routes all trusted write operations through Deno-based Edge Functions that verify the caller's JWT and enforce business rules before touching the database.

There is no custom backend server. Vercel hosts the static frontend bundle. Supabase hosts everything else.

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (React SPA)                   │
│                                                          │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │ React Router │  │ React Query │  │ React Hook Form│  │
│  │     v6       │  │  + Zod      │  │   + Zod        │  │
│  └──────┬───────┘  └──────┬──────┘  └───────┬────────┘  │
│         │                 │                  │           │
│         └─────────────────┴──────────────────┘           │
│                           │                              │
│              Supabase JS Client (@supabase/supabase-js)  │
│                    (anon key, from env)                  │
└───────────────────────────┬──────────────────────────────┘
                            │
              ┌─────────────┴──────────────┐
              │                            │
    ┌─────────▼──────────┐    ┌────────────▼────────────┐
    │  Supabase Auth     │    │  Supabase Postgres       │
    │  (email+password)  │    │  (RLS enforced reads)    │
    └────────────────────┘    └─────────────────────────┘
                                           │
                            ┌──────────────▼──────────────┐
                            │   Supabase Edge Functions    │
                            │   (Deno, service-role key)   │
                            │                              │
                            │  POST /create-organization   │
                            │  POST /invite-member         │
                            └─────────────────────────────┘
```

### Key Architectural Decisions

- **Reads go direct**: The Supabase JS client with the anon key handles all SELECT queries. RLS policies ensure each admin only sees their own data.
- **Writes go through Edge Functions**: `create-organization` and `invite-member` use the service-role key internally, verify the caller's JWT, check business rules, then insert. This prevents client-side tampering.
- **No custom server**: Keeps infrastructure minimal and deployment simple (Vercel + Supabase free tier).
- **React Query for all server state**: No raw `useEffect + fetch`. Every query and mutation goes through React Query hooks.

---

## 2. Database Schema

### 2.1 Table: `profiles`

Auto-created by a database trigger when a new user signs up via Supabase Auth.

```sql
CREATE TABLE public.profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text,
  is_admin    boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
```

**Profile_Trigger** — fires on every `INSERT` into `auth.users`:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, is_admin)
  VALUES (NEW.id, NULL, true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

### 2.2 Table: `organizations`

```sql
CREATE TYPE public.org_type AS ENUM (
  'school',
  'nonprofit',
  'business',
  'government',
  'startup'
);

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
```

---

### 2.3 Table: `organization_members`

```sql
CREATE TYPE public.member_status AS ENUM ('invited', 'active');
CREATE TYPE public.member_role   AS ENUM ('admin', 'member');

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
```

---

### 2.4 Member Count View (for directory)

To efficiently fetch member counts alongside organizations:

```sql
CREATE OR REPLACE VIEW public.organizations_with_member_count AS
SELECT
  o.*,
  COUNT(m.id)::int AS member_count
FROM public.organizations o
LEFT JOIN public.organization_members m ON m.organization_id = o.id
GROUP BY o.id;
```

---

## 3. Row-Level Security Policies

### 3.1 `profiles`

```sql
-- Users can only read their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());
```

### 3.2 `organizations`

```sql
-- Admins can only read their own organizations
CREATE POLICY "orgs_select_own"
  ON public.organizations FOR SELECT
  USING (created_by = auth.uid());

-- Admins can insert organizations they own
CREATE POLICY "orgs_insert_own"
  ON public.organizations FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Admins can update their own organizations
CREATE POLICY "orgs_update_own"
  ON public.organizations FOR UPDATE
  USING (created_by = auth.uid());

-- Admins can delete their own organizations
CREATE POLICY "orgs_delete_own"
  ON public.organizations FOR DELETE
  USING (created_by = auth.uid());
```

### 3.3 `organization_members`

```sql
-- Admins can read members of their own organizations
CREATE POLICY "members_select_own_org"
  ON public.organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id
        AND o.created_by = auth.uid()
    )
  );

-- INSERT and UPDATE are handled exclusively by Edge Functions
-- using the service-role key (bypasses RLS intentionally)
```

---

## 4. Edge Function Design

### 4.1 `create-organization`

**File**: `supabase/functions/create-organization/index.ts`

**Request**:
```
POST /functions/v1/create-organization
Authorization: Bearer <user-jwt>
Content-Type: application/json

{
  "name": "Lincoln High School",
  "type": "school",
  "school_district": "Chicago Public Schools"
}
```

**Zod Schema**:
```typescript
const CreateOrgSchema = z.discriminatedUnion('type', [
  z.object({
    name: z.string().min(1).max(100),
    type: z.literal('school'),
    school_district: z.string().min(1),
  }),
  z.object({
    name: z.string().min(1).max(100),
    type: z.enum(['nonprofit', 'business', 'government', 'startup']),
    school_district: z.string().optional(),
  }),
]);
```

**Processing Flow**:
1. Extract JWT from `Authorization: Bearer` header → 401 if missing/invalid
2. Decode JWT to get `user_id`
3. Query `profiles` where `id = user_id` → check `is_admin = true` → 403 if not
4. Validate request body with Zod schema → 400 with field errors if invalid
5. Insert into `organizations` with `created_by = user_id`
6. Return 201 with the created organization record

**CORS**: Both Edge Functions must handle `OPTIONS` preflight requests and include the following headers on all responses, since they are called from a browser:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle OPTIONS preflight
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}
```

**Response (201)**:
```json
{
  "id": "uuid",
  "name": "Lincoln High School",
  "type": "school",
  "school_district": "Chicago Public Schools",
  "created_by": "user-uuid",
  "created_at": "2026-05-31T00:00:00Z"
}
```

---

### 4.2 `invite-member`

**File**: `supabase/functions/invite-member/index.ts`

**Request**:
```
POST /functions/v1/invite-member
Authorization: Bearer <user-jwt>
Content-Type: application/json

{
  "organization_id": "org-uuid",
  "email": "member@example.com"
}
```

**Zod Schema**:
```typescript
const InviteMemberSchema = z.object({
  organization_id: z.string().uuid(),
  email: z.string().email().max(254),
});
```

**Processing Flow**:
1. Extract JWT from `Authorization: Bearer` header → 401 if missing/invalid
2. Decode JWT to get `user_id`
3. Validate request body with Zod schema → 400 with field errors if invalid
4. Query `organizations` where `id = organization_id` → 404 if not found
5. Check `organizations.created_by = user_id` → 403 if not owner
6. Check `organization_members` for existing row with same `(organization_id, email)` → 409 if exists
7. Insert into `organization_members` with `status = 'invited'`, `role = 'member'`, `joined_at = null`
8. Return 201 with the created member record

**Response (201)**:
```json
{
  "id": "uuid",
  "organization_id": "org-uuid",
  "email": "member@example.com",
  "status": "invited",
  "role": "member",
  "invited_at": "2026-05-31T00:00:00Z",
  "joined_at": null
}
```

**Error Responses**:
| Status | Condition |
|--------|-----------|
| 400 | Zod validation failure — returns `{ errors: { field: message } }` |
| 401 | Missing or invalid JWT |
| 403 | Caller does not own the organization |
| 404 | Organization not found |
| 409 | Email already invited to this organization |
| 500 | Unexpected server error |

---

## 5. Frontend Architecture

### 5.1 Provider Stack

Providers wrap the app from outermost to innermost:

```tsx
// main.tsx
<ThemeProvider defaultTheme="light" storageKey="dashboard-theme">
  <QueryProvider>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </QueryProvider>
</ThemeProvider>
```

- **ThemeProvider** (`next-themes`): manages light/dark mode, persists to `localStorage`
- **QueryProvider**: creates and provides the TanStack Query `QueryClient`
- **AuthProvider**: subscribes to `supabase.auth.onAuthStateChange`, exposes `{ user, session, loading }` via context
- **RouterProvider**: React Router v6 `createBrowserRouter`

---

### 5.2 Router Structure

```typescript
const router = createBrowserRouter([
  // Public routes (redirect to / if already authed)
  {
    path: '/sign-in',
    element: <GuestRoute><SignInPage /></GuestRoute>,
  },
  {
    path: '/sign-up',
    element: <GuestRoute><SignUpPage /></GuestRoute>,
  },

  // Protected routes (redirect to /sign-in if not authed)
  {
    element: <ProtectedRoute><AppShell /></ProtectedRoute>,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'organizations/new', element: <CreateOrgPage /> },
      { path: 'organizations/:id', element: <OrgDetailPage /> },
    ],
  },

  // 404
  { path: '*', element: <NotFoundPage /> },
]);
```

**`ProtectedRoute`** — checks `AuthProvider` context:
- If `loading`: render a full-page spinner
- If no `session`: redirect to `/sign-in?redirect=<current-path>`
- If `session` exists: render children

**`GuestRoute`** — checks `AuthProvider` context:
- If `session` exists: redirect to `/`
- Otherwise: render children

---

### 5.3 Component Tree

```
AppShell
├── Sidebar
│   ├── Logo
│   ├── NavLink (Dashboard)
│   ├── NavLink (Create Organization)
│   ├── ThemeToggle          ← Lucide React icon (Sun/Moon)
│   └── UserMenu (full_name or email + SignOut button)
└── <Outlet /> (page content)
    ├── DashboardPage
    │   ├── PageHeader ("Organizations")
    │   ├── SearchInput       ← client-side filter (see §5.7)
    │   ├── CreateOrgButton → navigates to /organizations/new
    │   └── OrgTable / OrgGrid
    │       └── OrgCard (name, OrgTypeBadge, member count, date)
    │
    ├── CreateOrgPage
    │   ├── PageHeader ("Create Organization")
    │   └── OrgForm
    │       ├── NameField
    │       ├── TypeSelect (School | Nonprofit | Business | Government | Startup)
    │       ├── SchoolDistrictField (conditional, shown only when type=school)
    │       ├── CancelButton
    │       └── SubmitButton (with loading state)
    │
    ├── SignInPage
    │   ├── SignInForm (email + password + submit)
    │   └── Link → /sign-up ("Don't have an account? Sign up")
    │
    ├── SignUpPage
    │   ├── SignUpForm (email + password + submit)
    │   └── Link → /sign-in ("Already have an account? Sign in")
    │
    └── OrgDetailPage
        ├── PageHeader (org name + OrgTypeBadge)
        ├── BackLink (← Organizations)
        ├── OrgMetaCard (name, type, school_district?, created_at)
        ├── SectionHeader ("Members")
        ├── InviteForm
        │   ├── EmailField
        │   └── InviteButton (with loading state)
        └── MemberTable
            └── MemberRow (email, MemberStatusBadge, role, invited_at)
```

---

### 5.4 React Query Key Conventions

All query keys follow a consistent array pattern:

| Data | Query Key | Invalidated By |
|------|-----------|----------------|
| All organizations | `['organizations']` | `create-organization` success |
| Single organization | `['organization', id]` | — |
| Members of an org | `['members', orgId]` | `invite-member` success |
| Current user profile | `['profile', userId]` | — |

---

### 5.5 Custom Hooks

```
src/hooks/
├── useAuth.ts              — consumes AuthProvider context
├── useProfile.ts           — useQuery(['profile', userId]) → fetches profiles row for nav display
├── useOrganizations.ts     — useQuery(['organizations']) — ordered by created_at DESC
├── useOrganization.ts      — useQuery(['organization', id])
├── useCreateOrganization.ts — useMutation → POST /create-organization
├── useMembers.ts           — useQuery(['members', orgId])
└── useInviteMember.ts      — useMutation → POST /invite-member
```

**`useCreateOrganization`** example pattern:
```typescript
export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOrgInput) => createOrganizationFn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}
```

---

### 5.6 Zod Schemas (shared client + Edge Function)

```typescript
// src/lib/schemas.ts

export const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const CreateOrgSchema = z.discriminatedUnion('type', [
  z.object({
    name: z.string().min(1).max(100),
    type: z.literal('school'),
    school_district: z.string().min(1),
  }),
  z.object({
    name: z.string().min(1).max(100),
    type: z.enum(['nonprofit', 'business', 'government', 'startup']),
    school_district: z.string().optional(),
  }),
]);

export const InviteMemberSchema = z.object({
  email: z.string().email().max(254),
});

export type CreateOrgInput = z.infer<typeof CreateOrgSchema>;
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;
```

---

### 5.7 Search / Filter Strategy

Search on the Organization Directory is **client-side** — the full list is fetched once via React Query and filtered in-memory using `useMemo`:

```typescript
const filtered = useMemo(() =>
  organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase())
  ),
  [organizations, searchTerm]
);
```

Rationale: admin org counts are small (personal dashboard, not multi-tenant). Client-side filtering avoids extra round-trips and keeps the UX instant. The search input is capped at 100 characters (per Req 5.8).

---

### 5.8 Notification / Feedback Pattern

All user-facing feedback follows a consistent two-layer pattern:

| Scenario | Display Method |
|----------|---------------|
| Form field validation error | Inline error text below the field (React Hook Form `formState.errors`) |
| Mutation success (create org, invite member) | shadcn/ui `Toast` (bottom-right, auto-dismiss after 4s) |
| Mutation error (API/Edge Fn error) | shadcn/ui `Toast` (destructive variant, bottom-right) |
| Duplicate invite (409) | shadcn/ui `Toast` (destructive variant) with specific message |
| Query load error | Inline error banner within the affected section + retry button |
| Sign-out error | Inline error banner in the nav area |

The `Toaster` component from shadcn/ui is mounted once in `AppShell` so it is available on all protected pages. Auth error messages (wrong credentials, email in use) are displayed as inline form-level errors, not toasts, since they require user action.

---

### 5.9 Icon Library

All icons use **Lucide React** exclusively. No other icon library is introduced. Common icons used:

| Usage | Lucide Icon |
|-------|-------------|
| Theme toggle (light) | `Sun` |
| Theme toggle (dark) | `Moon` |
| Sign out | `LogOut` |
| Create org | `Plus` |
| Back navigation | `ArrowLeft` |
| Search | `Search` |
| Empty state | `Building2` / `Users` |
| Error state | `AlertCircle` |

---

## 6. TypeScript Type Definitions

### 6.1 Database Types (`src/types/database.types.ts`)

Generated via Supabase CLI (`supabase gen types typescript`), then extended:

```typescript
export type OrgType = 'school' | 'nonprofit' | 'business' | 'government' | 'startup';
export type MemberStatus = 'invited' | 'active';
export type MemberRole = 'admin' | 'member';

export interface Profile {
  id: string;
  full_name: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  type: OrgType;
  school_district: string | null;
  created_by: string;
  created_at: string;
  member_count?: number; // from view
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string | null;
  email: string;
  status: MemberStatus;
  role: MemberRole;
  invited_at: string;
  joined_at: string | null;
}
```

### 6.2 AuthContext Type (`src/providers/AuthProvider.tsx`)

```typescript
import { Session, User } from '@supabase/supabase-js';

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
});
```

The `useAuth` hook simply consumes this context:

```typescript
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
```

---

## 7. Data Flow Diagrams

### 7.1 Sign-Up Flow

```
User fills SignUpForm
  → React Hook Form validates (Zod: email format, password ≥ 8 chars)
  → supabase.auth.signUp({ email, password })
  → Supabase creates auth.users row
  → Profile_Trigger fires → inserts profiles row (is_admin = true)
  → Auth session established
  → AuthProvider detects session change
  → Router redirects to /
```

### 7.2 Create Organization Flow

```
Admin fills OrgForm
  → React Hook Form validates (Zod: name, type, conditional school_district)
  → useCreateOrganization mutation fires
  → fetch POST /functions/v1/create-organization
      headers: { Authorization: Bearer <jwt> }
      body: { name, type, school_district? }
  → Edge Function: verify JWT → check is_admin → Zod validate → INSERT
  → 201 response with org record
  → React Query invalidates ['organizations']
  → DashboardPage re-fetches and shows new org
  → Success toast shown
  → Router navigates to /
```

### 7.3 Invite Member Flow

```
Admin fills InviteForm on OrgDetailPage
  → React Hook Form validates (Zod: email format, max 254 chars)
  → useInviteMember mutation fires
  → fetch POST /functions/v1/invite-member
      headers: { Authorization: Bearer <jwt> }
      body: { organization_id, email }
  → Edge Function: verify JWT → Zod validate → check org ownership
      → check duplicate (UNIQUE constraint + explicit query)
      → INSERT organization_members (status=invited, role=member)
  → 201 response with member record
  → React Query invalidates ['members', orgId]
  → MemberTable re-fetches and shows new member with 'invited' badge
  → Success toast shown, InviteForm email field cleared
```

### 7.4 Auth Session Restore on Page Load

```
App mounts
  → AuthProvider calls supabase.auth.getSession()
  → If session exists: set user in context, render protected routes
  → If no session: set user = null, ProtectedRoute redirects to /sign-in
  → supabase.auth.onAuthStateChange() keeps session in sync
```

---

## 8. UI Component Design

### 8.1 OrgTypeBadge

Each org type maps to a distinct color variant:

| Type | Badge Color |
|------|-------------|
| school | Blue |
| nonprofit | Green |
| business | Purple |
| government | Orange |
| startup | Pink |

### 8.2 MemberStatusBadge

| Status | Badge Color |
|--------|-------------|
| invited | Yellow |
| active | Green |

### 8.3 Loading States

- **Organization list loading**: 3 skeleton card rows
- **Org detail loading**: skeleton for org meta + 3 skeleton member rows
- **Form submit in-flight**: submit button shows spinner + disabled state

### 8.4 Empty States

- **No organizations**: illustration + "You haven't created any organizations yet." + "Create Organization" button
- **No members**: "No members yet." + "Invite your first member below."
- **Search no results**: "No organizations match '{searchTerm}'."

---

## 9. File Structure

```
admin-org-dashboard/
│
├── .kiro/
│   └── specs/
│       └── admin-org-dashboard/
│           ├── requirements.md
│           ├── design.md
│           └── tasks.md
│
├── src/
│   ├── components/
│   │   ├── ui/                         # shadcn/ui (Button, Input, Badge, Dialog, etc.)
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── organizations/
│   │   │   ├── OrgCard.tsx
│   │   │   ├── OrgTypeBadge.tsx
│   │   │   └── OrgForm.tsx
│   │   └── members/
│   │       ├── MemberList.tsx
│   │       ├── MemberStatusBadge.tsx
│   │       └── InviteForm.tsx
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── SignInPage.tsx
│   │   │   └── SignUpPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── CreateOrgPage.tsx
│   │   ├── OrgDetailPage.tsx
│   │   └── NotFoundPage.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useOrganizations.ts
│   │   ├── useOrganization.ts
│   │   ├── useCreateOrganization.ts
│   │   ├── useMembers.ts
│   │   └── useInviteMember.ts
│   │
│   ├── lib/
│   │   ├── supabase.ts                 # createClient(url, anonKey)
│   │   ├── schemas.ts                  # All Zod schemas + inferred types
│   │   └── utils.ts                    # cn(), formatDate()
│   │
│   ├── types/
│   │   ├── database.types.ts           # Supabase CLI generated + manual extensions
│   │   └── index.ts                    # Re-exports
│   │
│   ├── router/
│   │   ├── index.tsx                   # createBrowserRouter
│   │   ├── ProtectedRoute.tsx
│   │   └── GuestRoute.tsx
│   │
│   ├── providers/
│   │   ├── AuthProvider.tsx
│   │   ├── QueryProvider.tsx
│   │   └── ThemeProvider.tsx
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_profiles.sql
│   │   ├── 002_organizations.sql
│   │   ├── 003_organization_members.sql
│   │   └── 004_rls_policies.sql
│   └── functions/
│       ├── _shared/
│       │   └── cors.ts                 # Shared CORS headers for all Edge Functions
│       ├── create-organization/
│       │   └── index.ts
│       └── invite-member/
│           └── index.ts
│
├── .env.example
├── .gitignore
├── vercel.json                         # SPA catch-all rewrite
├── package.json                        # npm dependencies + scripts
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json                       # strict: true
├── tsconfig.node.json
├── components.json                     # shadcn/ui config
└── README.md
```

---

## 10. Environment Variables

| Variable | Used In | Description |
|----------|---------|-------------|
| `VITE_SUPABASE_URL` | Frontend (`src/lib/supabase.ts`) | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend (`src/lib/supabase.ts`) | Public anon key for RLS-gated reads |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions only (Supabase secret) | Bypasses RLS for trusted writes |

The service-role key is **never** prefixed with `VITE_` and **never** included in the client bundle. It is set as a Supabase project secret via `supabase secrets set`.

---

## 11. Deployment Architecture

```
GitHub Repository
├── main branch          → Vercel Production deployment
└── development branch   → Vercel Preview deployment

Vercel Environment Variables (set in Vercel dashboard):
  VITE_SUPABASE_URL      = <production supabase url>
  VITE_SUPABASE_ANON_KEY = <production anon key>

Supabase Edge Function Secrets (set via CLI):
  SUPABASE_SERVICE_ROLE_KEY = <service role key>
```

Both Vercel environments point to the same Supabase project (or separate projects for prod/dev if desired). The frontend build is purely static — Vite outputs to `dist/` and Vercel serves it as a CDN-cached SPA with a catch-all rewrite to `index.html` for client-side routing.

### 11.1 Vercel SPA Rewrite Config

A `vercel.json` at the project root is required to ensure all routes are served by `index.html` (React Router handles routing client-side):

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Without this, direct navigation to `/organizations/123` on Vercel returns a 404 from the CDN instead of loading the SPA.

### 11.2 Failed Sign-In Attempt Tracking

The rate-limit warning (Req 2.7) is tracked client-side using a `useState` counter that increments on each `AuthApiError` response from `supabase.auth.signInWithPassword`. After 5 consecutive failures, an additional warning message is shown below the form error. The counter resets on successful sign-in or page navigation. Actual rate-limiting is enforced server-side by Supabase Auth — the client message is informational only.

```typescript
const [failedAttempts, setFailedAttempts] = useState(0);
// On auth error: setFailedAttempts(prev => prev + 1)
// Show warning when failedAttempts >= 5
```
