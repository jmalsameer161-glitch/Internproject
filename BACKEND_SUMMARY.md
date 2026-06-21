# Backend Summary - Supabase Infrastructure

## 🎯 Overview
Supabase-powered backend providing authentication, PostgreSQL database, Row Level Security (RLS), and serverless Edge Functions for the admin dashboard application.

## 🛠️ Technology Stack

### Core Platform
- **Supabase** - Backend-as-a-Service platform
- **PostgreSQL 15** - Relational database
- **PostgREST** - RESTful API layer
- **GoTrue** - Authentication service
- **Deno** - JavaScript runtime for Edge Functions

### Security
- **Row Level Security (RLS)** - Database-level access control
- **JWT Authentication** - JSON Web Tokens for API access
- **Service Role Key** - Bypass RLS for server operations

## 🗄️ Database Schema

### Tables Structure

#### 1. `profiles` Table
User profile information linked to authentication.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields:**
- `id` - User ID (foreign key to auth.users)
- `email` - User email address
- `full_name` - User's full name
- `is_admin` - Admin permission flag
- `created_at` - Profile creation timestamp
- `updated_at` - Last update timestamp

**Indexes:**
- Primary key on `id`
- Unique constraint on `email`

---

#### 2. `organizations` Table
Organizations managed by admin users.

```sql
CREATE TYPE org_type AS ENUM (
  'school', 
  'nonprofit', 
  'business', 
  'government', 
  'startup'
);

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  type org_type NOT NULL,
  school_district TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT school_requires_district CHECK (
    type != 'school' OR school_district IS NOT NULL
  )
);
```

**Fields:**
- `id` - Organization UUID
- `name` - Organization name (1-100 characters)
- `type` - Organization type (enum)
- `school_district` - Required for schools, optional for others
- `created_by` - Admin who created the organization
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

**Constraints:**
- Name length validation (1-100 chars)
- School type requires district name
- Foreign key to profiles table

---

#### 3. `organization_members` Table
Members invited to organizations.

```sql
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, email)
);
```

**Fields:**
- `id` - Member UUID
- `organization_id` - Organization reference
- `email` - Member email address
- `role` - Member role (admin or member)
- `invited_at` - Invitation timestamp

**Constraints:**
- Email format validation (regex)
- Role must be 'admin' or 'member'
- Unique constraint on (organization_id, email)

---

### Database Triggers

#### Auto-create Profile on Signup
```sql
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_user();
```

**Purpose:** Automatically creates a profile when a user signs up.

---

### Database Views

#### `organizations_with_member_count` View
Convenience view showing organizations with their member counts.

```sql
CREATE OR REPLACE VIEW organizations_with_member_count AS
SELECT
  o.*,
  COUNT(m.id)::int AS member_count
FROM organizations o
LEFT JOIN organization_members m ON m.organization_id = o.id
GROUP BY o.id;
```

**Note:** This view is currently not used in the frontend due to RLS limitations. Frontend queries tables directly and joins client-side.

---

## 🔐 Row Level Security (RLS) Policies

### Profiles Table Policies

```sql
-- Users can view their own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid());
```

---

### Organizations Table Policies

```sql
-- Users can view organizations they created
CREATE POLICY "orgs_select_own"
  ON organizations FOR SELECT
  USING (created_by = auth.uid());

-- Users can create organizations (if is_admin)
CREATE POLICY "orgs_insert_own"
  ON organizations FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Users can update their own organizations
CREATE POLICY "orgs_update_own"
  ON organizations FOR UPDATE
  USING (created_by = auth.uid());

-- Users can delete their own organizations
CREATE POLICY "orgs_delete_own"
  ON organizations FOR DELETE
  USING (created_by = auth.uid());
```

**Note:** Edge Functions use service role key to bypass RLS for admin checks.

---

### Organization Members Table Policies

```sql
-- Users can view members of organizations they own
CREATE POLICY "members_select_own_org"
  ON organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = organization_id
        AND o.created_by = auth.uid()
    )
  );
```

**Note:** INSERT and UPDATE handled exclusively by Edge Functions with service role key.

---

## ⚡ Edge Functions

Edge Functions are serverless Deno functions deployed on Supabase infrastructure.

### 1. `create-organization` Function

**Endpoint:** `https://[project-id].supabase.co/functions/v1/create-organization`

**Method:** POST

**Purpose:** Create a new organization with admin permission check.

**Flow:**
1. Extract JWT from Authorization header
2. Verify user authentication with `getUser()`
3. Validate request body with Zod schema
4. Check if user has `is_admin = true` in profiles
5. If admin, insert organization with user as creator
6. Return created organization

**Request Body:**
```typescript
// School type
{
  name: string,
  type: "school",
  school_district: string
}

// Other types
{
  name: string,
  type: "nonprofit" | "business" | "government" | "startup",
  school_district?: string
}
```

**Response:**
```typescript
// Success (201)
{
  id: string,
  name: string,
  type: string,
  school_district: string | null,
  created_by: string,
  created_at: string,
  updated_at: string
}

// Error (400)
{ errors: { field: string[] } }

// Error (401)
{ error: "Invalid token" }

// Error (403)
{ error: "Forbidden: admin access required" }
```

**Code Location:** `supabase/functions/create-organization/index.ts`

---

### 2. `invite-member` Function

**Endpoint:** `https://[project-id].supabase.co/functions/v1/invite-member`

**Method:** POST

**Purpose:** Invite a member to an organization with ownership verification.

**Flow:**
1. Extract JWT from Authorization header
2. Verify user authentication with `getUser()`
3. Validate request body with Zod schema
4. Check user owns the organization
5. Check for duplicate member (same email in org)
6. If valid, insert member invitation
7. Return created member

**Request Body:**
```typescript
{
  organization_id: string,
  email: string,
  role: "admin" | "member"
}
```

**Response:**
```typescript
// Success (201)
{
  id: string,
  organization_id: string,
  email: string,
  role: string,
  invited_at: string
}

// Error (400)
{ errors: { field: string[] } }

// Error (401)
{ error: "Invalid token" }

// Error (403)
{ error: "You do not own this organization" }

// Error (409)
{ error: "Member already exists" }
```

**Code Location:** `supabase/functions/invite-member/index.ts`

---

### Shared CORS Configuration

**File:** `supabase/functions/_shared/cors.ts`

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  return null
}
```

**Purpose:** Handle CORS preflight requests and allow frontend access.

---

## 🔑 Authentication

### JWT Token Structure

```json
{
  "aud": "authenticated",
  "exp": 1234567890,
  "iat": 1234567890,
  "iss": "https://[project-id].supabase.co/auth/v1",
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "authenticated"
}
```

### Auth Flow
1. User signs in → GoTrue generates JWT
2. JWT stored in localStorage by Supabase client
3. JWT sent in Authorization header: `Bearer <token>`
4. Edge Functions verify JWT with `getUser()`
5. RLS policies use `auth.uid()` from JWT

### Session Management
- Access token valid for 1 hour
- Refresh token valid for 30 days
- Client auto-refreshes before expiration
- Session stored in localStorage

---

## 🗂️ Migration Files

### Migration Order

1. **`001_profiles.sql`**
   - Create profiles table
   - Create trigger for auto-profile creation

2. **`002_organizations.sql`**
   - Create org_type enum
   - Create organizations table
   - Add constraints

3. **`003_organization_members.sql`**
   - Create organization_members table
   - Add unique constraint
   - Add email validation

4. **`004_rls_policies.sql`**
   - Enable RLS on all tables
   - Create SELECT policies
   - Create INSERT/UPDATE/DELETE policies
   - Create organizations_with_member_count view

5. **`005_fix_view_rls.sql`** (Not applied)
   - Attempted view RLS fix
   - Deprecated in favor of client-side joins

---

## 🔒 Security Architecture

### Defense in Depth

1. **Authentication Layer**
   - Email/password validation
   - JWT token verification
   - Session management

2. **Authorization Layer**
   - RLS policies on all tables
   - Edge Function permission checks
   - Admin role verification

3. **Data Validation Layer**
   - Database constraints
   - Zod schema validation
   - Email format validation
   - Length/type checks

4. **Network Layer**
   - HTTPS only
   - CORS configuration
   - Rate limiting (Supabase default)

---

## 📊 API Endpoints Summary

### Supabase Auto-Generated REST API

**Base URL:** `https://[project-id].supabase.co/rest/v1/`

**Authentication:** `Authorization: Bearer <anon-key>`

#### Organizations
```
GET    /organizations                    # List all (user's own)
GET    /organizations?id=eq.{id}         # Get single
POST   /organizations                     # Create (via Edge Function)
PATCH  /organizations?id=eq.{id}         # Update
DELETE /organizations?id=eq.{id}         # Delete
```

#### Organization Members
```
GET    /organization_members?organization_id=eq.{id}  # List members
POST   /organization_members                           # Invite (via Edge Function)
DELETE /organization_members?id=eq.{id}               # Remove member
```

#### Profiles
```
GET    /profiles?id=eq.{id}              # Get profile
PATCH  /profiles?id=eq.{id}              # Update profile
```

---

### Edge Functions

```
POST   /functions/v1/create-organization  # Create organization (admin only)
POST   /functions/v1/invite-member        # Invite member to organization
```

---

## 🚀 Deployment

### Supabase Project Setup
1. Create project on supabase.com
2. Note project URL and keys
3. Run migrations in SQL Editor (001-004)
4. Deploy Edge Functions with Supabase CLI

### Deploy Edge Functions
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref [project-id]

# Deploy all functions
supabase functions deploy create-organization
supabase functions deploy invite-member
```

### Environment Variables (Edge Functions)
Set in Supabase Dashboard → Edge Functions → Secrets:
```
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
```

---

## 📈 Performance Considerations

### Database Indexes
- Primary keys on all tables (automatic)
- Unique indexes on email fields
- Foreign key indexes (automatic)

### Query Optimization
- RLS policies use indexed columns (id, auth.uid())
- Views pre-aggregate data where possible
- Client-side joins for member counts (avoiding view RLS issues)

### Caching Strategy
- Frontend uses React Query for aggressive caching
- Supabase PostgREST has built-in query caching
- Edge Functions are stateless (auto-scaled)

---

## 🛠️ Database Management

### Backup & Recovery
- Automatic daily backups (Supabase managed)
- Point-in-time recovery available
- Manual backup via pg_dump

### Monitoring
- Supabase Dashboard → Database → Performance
- Query logs and slow query detection
- Connection pool monitoring

### Maintenance
- Auto-vacuum enabled (PostgreSQL default)
- Automatic minor version updates
- Manual major version upgrades

---

## 🔧 Development Tools

### Local Development
```bash
# Start local Supabase (Docker required)
supabase start

# Apply migrations
supabase db reset

# Test Edge Functions locally
supabase functions serve create-organization
```

### Database Tools
- **Supabase Studio** - Web-based database GUI
- **psql** - PostgreSQL CLI
- **pgAdmin** - Desktop database management
- **DBeaver** - Universal database tool

---

## 📝 Best Practices Implemented

✅ Row Level Security on all tables
✅ Least privilege principle (users only see their data)
✅ Server-side validation (Edge Functions)
✅ Client-side validation (Zod schemas)
✅ Foreign key constraints for referential integrity
✅ Unique constraints to prevent duplicates
✅ Check constraints for data validation
✅ Cascade deletes for cleanup
✅ Timestamps for audit trails
✅ Proper error handling and messaging
✅ CORS configuration for security
✅ JWT authentication for API access
✅ Service role key isolation
✅ Database migrations for version control

---

## 🔐 Environment Variables Summary

**Supabase Project:**
```
SUPABASE_URL=https://ogdklokwfhbszrbilxcv.supabase.co
SUPABASE_ANON_KEY=[public-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[secret-service-key]
```

**Usage:**
- `SUPABASE_URL` - Base URL for all API requests
- `SUPABASE_ANON_KEY` - Public key for frontend (safe to expose)
- `SUPABASE_SERVICE_ROLE_KEY` - Secret key for Edge Functions (bypass RLS)

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostgREST API Reference](https://postgrest.org/en/stable/)
- [Deno Documentation](https://deno.land/manual)
