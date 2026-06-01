# Admin Organization Dashboard

A production-grade admin dashboard for managing organizations and their members. Admins sign up, create organizations (School, Nonprofit, Business, Government, Startup), and invite members by email. Built with React 18 + TypeScript + Vite + Supabase.

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 + TypeScript |
| Build Tool | Vite 5 (SWC) |
| Styling | Tailwind CSS v3 + shadcn/ui |
| Server State | TanStack React Query v5 |
| Forms | React Hook Form + Zod |
| Auth & Database | Supabase (Postgres, Auth, Edge Functions, RLS) |
| Routing | React Router v6 |
| Icons | Lucide React |
| Dark Mode | next-themes |
| Deployment | Vercel (frontend) + Supabase (backend) |

## Prerequisites

- **Node 18+** — check with `node --version`
- **Supabase CLI** — `npm install -g supabase`
- A Supabase project (free tier works fine)

## Local Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd frontend

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Open .env and fill in your Supabase credentials (see Environment Variables section below)

# 4. Start the development server
npm run dev
# App runs at http://localhost:5173
```

## Supabase Setup

```bash
# Link to your Supabase project
supabase link --project-ref <your-project-ref>

# Apply all database migrations
supabase db push

# Alternatively, run each migration manually in the Supabase SQL editor:
#   supabase/migrations/001_profiles.sql
#   supabase/migrations/002_organizations.sql
#   supabase/migrations/003_organization_members.sql
#   supabase/migrations/004_rls_policies.sql

# Deploy Edge Functions
supabase functions deploy create-organization
supabase functions deploy invite-member

# Set the service role secret (NEVER put this in .env or prefix with VITE_)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

## Environment Variables

| Variable | File | Where to find it |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env` | Supabase dashboard → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | `.env` | Supabase dashboard → Project Settings → API → anon / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret only | Supabase dashboard → Project Settings → API → service_role key |

> **Important**: `SUPABASE_SERVICE_ROLE_KEY` is set as a Supabase Edge Function secret via the CLI — it is never placed in `.env`, never prefixed with `VITE_`, and never included in the client bundle.

## Git Workflow

Two-branch workflow:

- `main` → Vercel **production** deployment (auto-deploys on push)
- `development` → Vercel **preview** deployment (auto-deploys on push)

All feature work is done on `development` and merged to `main` via pull request after review.

```bash
# Start a new feature
git checkout development
git pull origin development
git checkout -b feature/my-feature

# After work is done
git push -u origin feature/my-feature
# Open PR: feature/my-feature → development
# After review, merge to development, then open PR: development → main
```

## Seeded Test Credentials

A test admin account is pre-configured for the deployed app. The `profiles.is_admin` flag is set to `true` automatically for all new sign-ups via a database trigger.

```
Email:    admin@example.com
Password: AdminPass123
```

To create this account on a fresh Supabase project:
1. Go to Supabase dashboard → Authentication → Users → Add user
2. Enter the email and password above
3. Confirm the `profiles` table has a row with `is_admin = true` (the trigger handles this automatically)

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server at localhost:5173 |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run type-check` | Run `tsc --noEmit` — zero errors expected |
| `npm run lint` | Run ESLint with zero warnings allowed |

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui primitives (Button, Input, Badge, etc.)
│   │   ├── layout/          # AppShell, Sidebar
│   │   ├── organizations/   # OrgCard, OrgForm, OrgTypeBadge
│   │   └── members/         # MemberList, InviteForm, MemberStatusBadge
│   ├── pages/
│   │   ├── auth/            # SignInPage, SignUpPage
│   │   ├── DashboardPage    # Organization directory with search
│   │   ├── CreateOrgPage    # Organization creation form
│   │   ├── OrgDetailPage    # Org details + member list + invite form
│   │   └── NotFoundPage     # 404 handler
│   ├── hooks/               # React Query hooks (useOrganizations, useMembers, etc.)
│   ├── lib/                 # supabase client, Zod schemas, utility functions
│   ├── providers/           # AuthProvider, QueryProvider, ThemeProvider
│   ├── router/              # createBrowserRouter, ProtectedRoute, GuestRoute
│   └── types/               # TypeScript interfaces for DB entities
├── supabase/
│   ├── migrations/          # 4 numbered SQL migration files
│   └── functions/           # create-organization and invite-member Edge Functions
├── vercel.json              # SPA catch-all rewrite for client-side routing
└── .env.example             # Template for required environment variables
```

## What I'd Do With Another Day

- **Organization editing and deletion** — update/delete mutations with confirmation dialogs
- **Member role management** — promote/demote members between `admin` and `member` roles
- **Email sending on invite** — integrate Resend via Edge Function to send actual invitation emails
- **Pagination** — cursor-based pagination for large member lists
- **E2E tests** — Playwright tests covering the full sign-up → create org → invite member flow
- **Supabase type generation** — wire up `supabase gen types typescript` to keep DB types in sync automatically
- **Optimistic updates** — instant UI feedback on mutations before server confirmation
- **Code splitting** — dynamic imports for route-level chunks to reduce initial bundle size

## Tradeoffs & Shortcuts

- **Client-side search**: Organization search filters in-memory via `useMemo`. Fine for personal dashboards where org counts are small; would need server-side filtering with debounced queries for multi-tenant scale.
- **No email delivery**: Invitations create a DB record only — no actual email is sent. A production app would call Resend or similar from the Edge Function.
- **`is_admin` defaults to `true`**: Per spec, every new sign-up gets admin access automatically via the profile trigger. A real app would have an approval or invitation flow for admin provisioning.
- **Single Supabase project**: Both `development` and `main` branches point to the same Supabase project. A production setup would use separate projects (or schemas) for staging vs. production.
- **No refresh token rotation handling**: The Supabase JS client handles token refresh automatically, but there's no explicit handling for refresh failures (e.g., expired refresh token) beyond the auth state change listener redirecting to sign-in.

## Loom Video

[Link placeholder — add after recording walkthrough]
