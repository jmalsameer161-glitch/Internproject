# Implementation Plan

## Overview

Full-stack admin dashboard built with React 18 + TypeScript + Vite + Supabase. Tasks are ordered by dependency — each task builds on the previous. Git setup (branching, PRs, Vercel deployment) is handled separately by the developer.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1] },
    { "wave": 2, "tasks": [2] },
    { "wave": 3, "tasks": [3] },
    { "wave": 4, "tasks": [4] },
    { "wave": 5, "tasks": [5] },
    { "wave": 6, "tasks": [6, 9] },
    { "wave": 7, "tasks": [7, 10] },
    { "wave": 8, "tasks": [8, 11] },
    { "wave": 9, "tasks": [12] },
    { "wave": 10, "tasks": [13] }
  ]
}
```

## Tasks

- [x] 1. Project Scaffold and Configuration
  - Run `npm create vite@latest . -- --template react-swc-ts`
  - Configure `tsconfig.json` with `strict: true`, `baseUrl: "."`, paths alias `@/*` → `src/*`
  - Create `tsconfig.node.json` for Vite config compilation
  - Configure `vite.config.ts` with `resolve.alias` `@` → `src/` to mirror tsconfig paths
  - Install and configure Tailwind CSS v3: `tailwind.config.ts` with `content` paths and `darkMode: 'class'`, `postcss.config.js`, Tailwind directives in `src/index.css`
  - Install and initialise shadcn/ui: `npx shadcn-ui@latest init`, configure `components.json` with `@/` alias
  - Add shadcn/ui components: `button`, `input`, `label`, `badge`, `card`, `dialog`, `select`, `form`, `toast`, `skeleton`, `separator`
  - Install npm dependencies: `@supabase/supabase-js`, `@tanstack/react-query`, `react-router-dom`, `react-hook-form`, `@hookform/resolvers`, `zod`, `lucide-react`, `next-themes`, `clsx`, `tailwind-merge`
  - Install dev dependency: `@tanstack/react-query-devtools`
  - Create `.env.example` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and comments pointing to Supabase dashboard locations
  - Create `.gitignore` covering `node_modules`, `.env`, `.env.local`, `dist`, `supabase/.branches`, `supabase/.temp`, `.DS_Store`, `*.tsbuildinfo`
  - Create `vercel.json` with SPA catch-all rewrite: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`
  - Add `package.json` scripts: `dev`, `build` (`tsc && vite build`), `preview`, `lint`, `type-check` (`tsc --noEmit`)
  - Verify ESLint config exists with `@typescript-eslint` and `react-hooks` plugin rules
  - Create `src/App.tsx` rendering `<RouterProvider router={router} />` from `@/router`
  - Create `src/main.tsx` wrapping `<App />` in `<React.StrictMode>`, mounting to `#root`, conditionally rendering `<ReactQueryDevtools />` only when `import.meta.env.DEV`
  - Verify `npm run build` and `npm run type-check` complete with zero errors
  - **Covers**: Req 12 (project configuration), Req 13 (stack standards)

- [x] 2. Supabase Client, Types, Schemas, and Providers
  - Create `src/lib/supabase.ts` — initialise typed Supabase client from `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  - Create `src/types/database.types.ts` with: `OrgType`, `MemberStatus`, `MemberRole` union types; `Profile`, `Organization` (with optional `member_count`), `OrganizationMember` interfaces
  - Create `src/types/index.ts` re-exporting all types
  - Create `src/lib/schemas.ts` with Zod schemas: `SignUpSchema` (email, password min 8), `SignInSchema` (email, password min 1), `CreateOrgSchema` (discriminated union on `type` — school branch requires `school_district` min 1, name max 100), `InviteMemberSchema` (email max 254); export inferred types `SignUpInput`, `SignInInput`, `CreateOrgInput`, `InviteMemberInput`
  - Create `src/lib/utils.ts` with: `cn()` (clsx + tailwind-merge), `formatDate(iso)` returning YYYY-MM-DD, `getEdgeFunctionUrl(name)` returning full Edge Function URL from `VITE_SUPABASE_URL`, `getAuthHeader(accessToken)` returning `{ Authorization: 'Bearer <token>', 'Content-Type': 'application/json' }` for use in all mutation hooks
  - Create `src/providers/QueryProvider.tsx` with stable `QueryClient` configured: `staleTime: 60_000`, `retry: 1`, `refetchOnWindowFocus: false`
  - Create `src/providers/AuthProvider.tsx`: define and export `AuthContextValue { user, session, loading }`; restore session via `supabase.auth.getSession()` on mount; subscribe to `onAuthStateChange`; unsubscribe on unmount
  - Create `src/hooks/useAuth.ts` consuming `AuthContext`; throw descriptive error if used outside provider
  - Create `src/providers/ThemeProvider.tsx` wrapping next-themes `ThemeProvider` with `attribute="class"`, `defaultTheme="light"`, `storageKey="dashboard-theme"`, `enableSystem={false}`
  - **Covers**: Req 12 (env vars), Req 13 (React Query, Zod schemas)

- [x] 3. Database Migrations and RLS
  - Create `supabase/migrations/001_profiles.sql`: `CREATE TABLE public.profiles` (id, full_name, is_admin DEFAULT true, created_at); enable RLS; create `handle_new_user()` trigger function (SECURITY DEFINER); create `on_auth_user_created` trigger on `auth.users`
  - Create `supabase/migrations/002_organizations.sql`: `CREATE TYPE public.org_type AS ENUM` (5 values); `CREATE TABLE public.organizations` with all columns, CHECK constraints, `school_district_required` constraint; indexes on `created_by` and `created_at DESC`; enable RLS; create `organizations_with_member_count` view (LEFT JOIN + COUNT)
  - Create `supabase/migrations/003_organization_members.sql`: `CREATE TYPE public.member_status AS ENUM ('invited', 'active')`; `CREATE TYPE public.member_role AS ENUM ('admin', 'member')`; `CREATE TABLE public.organization_members` with all columns, `UNIQUE(organization_id, email)`; index on `organization_id`; enable RLS
  - Create `supabase/migrations/004_rls_policies.sql`: profiles (SELECT own, UPDATE own); organizations (SELECT/INSERT/UPDATE/DELETE own); organization_members (SELECT for org owner via EXISTS subquery)
  - Create `supabase/functions/_shared/cors.ts` with `corsHeaders` object and CORS preflight response helper
  - Verify `organizations_with_member_count` view returns only rows owned by the signed-in user (RLS inherited from organizations table)
  - **Covers**: Req 8 (RLS), Req 12.3 (migration files)

- [x] 4. Authentication Pages
  - Create `src/pages/auth/SignUpPage.tsx`: React Hook Form + `SignUpSchema` resolver; email field with inline error; password field with inline error (min 8 chars message); submit button with loading/disabled state; on success call `supabase.auth.signUp()` and redirect to `/`; on `AuthApiError` (email in use) show inline form-level error; link to `/sign-in`
  - Create `src/pages/auth/SignInPage.tsx`: React Hook Form + `SignInSchema` resolver; email and password fields with inline errors; `failedAttempts` counter — show rate-limit warning when ≥ 5, reset on success or unmount; on success read `?redirect=` via `useSearchParams()` and navigate there or to `/`; on `AuthApiError` show inline error and increment counter; link to `/sign-up`
  - Verify both pages are fully typed (no `any`) and all form states are handled
  - **Covers**: Req 1 (sign-up), Req 2 (sign-in)

- [x] 5. Router, Protected Routes, and App Shell
  - Create `src/router/ProtectedRoute.tsx`: reads `{ session, loading }` from `useAuth()`; if loading render full-page spinner; if no session redirect to `/sign-in?redirect=<pathname>`; if session render `<Outlet />`
  - Create `src/router/GuestRoute.tsx`: if session exists redirect to `/`; otherwise render children
  - Create `src/router/index.tsx` with `createBrowserRouter`: `/sign-in` → GuestRoute → SignInPage; `/sign-up` → GuestRoute → SignUpPage; `/`, `/organizations/new`, `/organizations/:id` → ProtectedRoute → AppShell (nested); `*` → NotFoundPage
  - Create `src/components/layout/AppShell.tsx`: renders Sidebar + `<Outlet />`; mounts shadcn/ui `<Toaster />` for toast notifications
  - Create `src/components/layout/Sidebar.tsx`: logo/app name; NavLink to `/` with active styling; NavLink to `/organizations/new`; ThemeToggle button using `useTheme()` (Sun icon in dark mode, Moon in light mode); UserMenu showing `profiles.full_name` from `useProfile` or `user.email` fallback + Sign Out button; sign-out calls `supabase.auth.signOut()` → redirect to `/sign-in`; on sign-out error show inline error in nav; mobile-responsive (hamburger/bottom nav at small screens)
  - Create `src/hooks/useProfile.ts`: `useQuery({ queryKey: ['profile', userId], queryFn })` fetching profiles row; returns `Profile | null`
  - Create `src/pages/NotFoundPage.tsx`: "Page not found" + ArrowLeft Lucide icon + link to `/`
  - Update `src/main.tsx`: wrap `<App />` with `ThemeProvider → QueryProvider → AuthProvider` inside `React.StrictMode`; render `<ReactQueryDevtools />` in dev only
  - Verify redirect-back: navigate to `/organizations/new` while signed out → sign in → lands on `/organizations/new`
  - Verify mobile layout usable at 375px viewport width
  - **Covers**: Req 3 (protected routes, sign-out, user display), Req 11 (404)

- [x] 6. Organization Directory
  - Create `src/hooks/useOrganizations.ts`: `useQuery({ queryKey: ['organizations'], queryFn })` fetching from `organizations_with_member_count` view ordered by `created_at DESC`; returns typed `Organization[]`
  - Create `src/components/organizations/OrgTypeBadge.tsx`: accepts `type: OrgType`; maps to shadcn/ui Badge color — school=blue, nonprofit=green, business=purple, government=orange, startup=pink
  - Create `src/components/organizations/OrgCard.tsx`: displays org name, OrgTypeBadge, member count, `formatDate(created_at)`; entire card clickable → navigates to `/organizations/:id`
  - Create `src/pages/DashboardPage.tsx`: page header "Organizations" + "Create Organization" button; search input (controlled, max 100 chars) with Search Lucide icon; `useMemo` client-side filter (case-insensitive); loading state: 3 Skeleton card rows; empty state (no orgs): Building2 icon + message + Create button; empty state (no search results): "No organizations match '{searchTerm}'"; error state: AlertCircle + message + Retry button calling `refetch()`; success: list of OrgCard components
  - Verify organizations sorted newest-first and search filters correctly
  - **Covers**: Req 5 (directory), Req 10 (loading/empty/error states)

- [x] 7. Organization Creation Form
  - Create `src/components/organizations/OrgForm.tsx`: React Hook Form + `CreateOrgSchema` resolver; name field (inline error if empty or > 100 chars); type select (5 options, inline error if not selected); school_district field — conditionally shown when `watch('type') === 'school'`, cleared via `setValue` when hidden, inline error if empty when type=school; Cancel button → `navigate(-1)`; Submit button disabled + spinner while mutation in flight
  - Create `src/hooks/useCreateOrganization.ts`: `useMutation` calling `fetch` POST to Edge Function URL via `getEdgeFunctionUrl('create-organization')`; attach JWT via `getAuthHeader(session.access_token)` from `useAuth()`; `onSuccess`: invalidate `['organizations']` + success toast + `navigate('/')`; `onError`: destructive toast with error message from response body
  - Create `src/pages/CreateOrgPage.tsx`: page header "Create Organization"; renders OrgForm
  - Verify conditional school_district field shows/hides and clears correctly on type change
  - **Covers**: Req 4 (org creation), Req 13 (React Hook Form + Zod)

- [x] 8. Edge Function — create-organization
  - Create `supabase/functions/create-organization/index.ts`
  - Import via esm.sh: `import { z } from 'https://esm.sh/zod@3'` and `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'`
  - Import shared CORS: `import { corsHeaders } from '../_shared/cors.ts'`
  - Read `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `Deno.env.get()`; create service-role client
  - Handle OPTIONS preflight → return 200 with corsHeaders
  - Extract JWT from `Authorization: Bearer` header → call `supabase.auth.getUser(token)` → return 401 JSON if error
  - Parse request body as JSON → validate with CreateOrgSchema → return 400 with `{ errors }` if invalid
  - Query profiles where `id = user.id` → check `is_admin = true` → return 403 if false
  - Insert into organizations with `created_by = user.id` using service-role client
  - Return 201 JSON with created org record + corsHeaders on all responses
  - Catch all errors → return 500 with `{ error: 'Internal server error' }`
  - Verify: 401 for missing JWT, 403 for non-admin, 400 for invalid payload, 201 for valid admin request
  - **Covers**: Req 4.9–4.15, Req 8.7–8.8

- [x] 9. Organization Detail Page
  - Create `src/hooks/useOrganization.ts`: `useQuery({ queryKey: ['organization', id], queryFn })` fetching single org by id; if result is empty (RLS filtered = not owned) treat as access denied; returns `Organization | null`
  - Create `src/pages/OrgDetailPage.tsx`: reads `:id` from `useParams()`; org loading: skeleton for meta card; org error: error banner + retry; access denied (null result): "Access denied" message + "Back to Organizations" link; displays org name, OrgTypeBadge, `formatDate(created_at)`; conditionally shows school_district if `type === 'school'`; page header with org name + OrgTypeBadge; BackLink `← Organizations` → navigates to `/`; renders InviteForm and MemberList (Task 10)
  - Verify access-denied state when navigating to org not owned by signed-in admin
  - **Covers**: Req 6 (org detail), Req 11.3–11.4 (breadcrumb, back link)

- [x] 10. Member List and Invite Form
  - Create `src/hooks/useMembers.ts`: `useQuery({ queryKey: ['members', orgId], queryFn })` fetching organization_members where `organization_id = orgId` ordered by `invited_at DESC`; returns typed `OrganizationMember[]`
  - Create `src/components/members/MemberStatusBadge.tsx`: invited → yellow Badge; active → green Badge
  - Create `src/components/members/MemberList.tsx`: accepts `orgId: string`; loading: 3 skeleton rows; empty: "No members yet. Invite your first member below."; error: error message + retry button; success: table with columns Email, Status (MemberStatusBadge), Role, Invited Date
  - Create `src/hooks/useInviteMember.ts`: `useMutation` calling `fetch` POST to `getEdgeFunctionUrl('invite-member')`; attach JWT via `getAuthHeader(session.access_token)` from `useAuth()`; body: `{ organization_id, email }`; `onSuccess`: invalidate `['members', orgId]` + success toast + reset form email field; `onError` 409: destructive toast "This email has already been invited"; `onError` other: destructive toast with error reason from response
  - Create `src/components/members/InviteForm.tsx`: React Hook Form + `InviteMemberSchema` resolver; email field with inline error (empty, malformed, > 254 chars); submit button disabled + spinner while in flight; calls `useInviteMember` on submit
  - Verify: invite success → member appears in list with "invited" badge; duplicate invite → specific 409 toast shown; email field clears after success
  - **Covers**: Req 6.3–6.6 (member list), Req 7 (invitations), Req 10 (states)

- [x] 11. Edge Function — invite-member
  - Create `supabase/functions/invite-member/index.ts`
  - Import via esm.sh: `import { z } from 'https://esm.sh/zod@3'` and `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'`
  - Import shared CORS: `import { corsHeaders } from '../_shared/cors.ts'`
  - Read `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `Deno.env.get()`; create service-role client
  - Handle OPTIONS preflight → return 200 with corsHeaders
  - Extract and verify JWT → return 401 if invalid
  - Parse and validate body with InviteMemberSchema → return 400 with `{ errors }` if invalid
  - Query organizations by `organization_id` → return 404 if not found
  - Check `organizations.created_by === user.id` → return 403 if not owner
  - Query organization_members for existing `(organization_id, email)` → return 409 if exists (regardless of status)
  - Insert into organization_members with `status='invited'`, `role='member'`, `joined_at=null`
  - Return 201 with created member record + corsHeaders
  - Catch all errors → return 500
  - Verify: 401 missing JWT, 403 non-owner, 404 unknown org, 409 duplicate email, 201 valid invite
  - **Covers**: Req 7.3–7.12, Req 8.7–8.8

- [x] 12. Dark Mode
  - Confirm `ThemeProvider` (Task 2) is outermost wrapper in `main.tsx` and `darkMode: 'class'` is in `tailwind.config.ts` (Task 1) — no code changes if already done
  - Confirm ThemeToggle in Sidebar uses `useTheme()`, renders Sun in dark mode and Moon in light mode, toggles correctly
  - Audit all custom components (OrgCard, OrgTypeBadge, MemberList, InviteForm, AppShell, Sidebar, auth pages) and add `dark:` Tailwind variants for background, text, and border colors not covered by shadcn/ui defaults
  - Verify all pages render correctly in both light and dark mode — no invisible text, no broken contrast
  - Verify theme preference persists across page reloads via localStorage key `dashboard-theme`
  - **Covers**: Req 9 (dark mode)

- [x] 13. Polish, README, Seed Credentials, and Final Verification
  - Audit all pages for consistent loading states — every `useQuery` shows skeleton/spinner while `isLoading`
  - Audit all pages for consistent error states — every `isError` shows error banner + retry button calling `refetch()`
  - Audit all pages for consistent empty states — every empty list shows contextual message + next-step prompt
  - Verify all forms use React Hook Form + Zod resolver — no raw `useState` for form field values
  - Verify no raw `useEffect + fetch` anywhere — all server state through React Query hooks
  - Run `npm run type-check` — zero errors, zero `any` types
  - Verify `SUPABASE_SERVICE_ROLE_KEY` is never referenced in any `src/` file
  - Verify only Lucide React icons used — no other icon library imported
  - Seed test admin credentials in Supabase: create admin user, confirm `profiles.is_admin = true`, note email + password for README
  - Create `README.md` with: project overview and tech stack; prerequisites (Node 18+, Supabase CLI); local setup steps (clone → install → copy `.env.example` → fill credentials → `npm run dev`); Supabase setup steps (run migrations, deploy Edge Functions, set secrets); two-branch Git workflow description; environment variable table; seeded test credentials; "What I'd do with another day" section; tradeoffs and shortcuts; Loom video link placeholder
  - Run `npm run build` — zero errors and zero TypeScript complaints
  - Verify `vercel.json` rewrite present and direct URL navigation works on Vercel preview without 404
  - Verify mobile layout at 375px: all pages usable, no horizontal overflow, nav accessible
  - **Covers**: Req 10 (states), Req 12.4 (README), Req 13 (code quality)

## Notes

- Git setup (branching, PRs, Vercel deployment) is handled by the developer separately
- Supabase credentials will be provided by the developer to wire up the client after scaffold is complete
- Tasks 8 and 11 (Edge Functions) can be developed in parallel with Tasks 7 and 10 respectively
- All mutation hooks (Task 7.2, Task 10.4) use `getAuthHeader(session.access_token)` from `src/lib/utils.ts` to attach the JWT — never hardcode the token
