# Frontend Summary - Production-Minded Admin Dashboard

## 🎯 Overview
A modern, responsive admin dashboard built with React, TypeScript, and Vite for managing organizations and their members. Features a clean UI with dark/light theme support and smooth animations.

## 🛠️ Technology Stack

### Core Framework
- **React 18.3** - UI library with hooks
- **TypeScript 5.6** - Type-safe JavaScript
- **Vite 6.0** - Fast build tool and dev server

### Routing & State Management
- **React Router DOM 7.1** - Client-side routing
- **TanStack Query (React Query) 5.62** - Server state management, caching, and data fetching

### UI & Styling
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **Shadcn/ui Components** - Accessible, customizable component library built on Radix UI
- **Lucide React** - Icon library
- **next-themes** - Dark/light theme management
- **class-variance-authority** - Component variant management

### Form Management & Validation
- **React Hook Form 7.54** - Performant form library with validation
- **Zod 3.24** - TypeScript-first schema validation
- **@hookform/resolvers** - React Hook Form + Zod integration

### Backend Integration
- **Supabase JS 2.47** - Supabase client for authentication and database operations

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx         # Main app layout wrapper
│   │   │   └── Sidebar.tsx          # Navigation sidebar with theme toggle
│   │   ├── organizations/
│   │   │   ├── OrgCard.tsx          # Organization card with animations
│   │   │   ├── OrgForm.tsx          # Create/edit organization form
│   │   │   ├── OrgTypeBadge.tsx     # Organization type badge
│   │   │   └── MemberForm.tsx       # Invite member form
│   │   └── ui/                      # Shadcn UI components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── select.tsx
│   │       ├── skeleton.tsx
│   │       ├── separator.tsx
│   │       ├── badge.tsx
│   │       └── toaster.tsx
│   ├── hooks/
│   │   ├── useAuth.ts               # Authentication hook
│   │   ├── useProfile.ts            # User profile hook
│   │   ├── useOrganizations.ts      # Fetch all organizations
│   │   ├── useOrganization.ts       # Fetch single organization
│   │   ├── useCreateOrganization.ts # Create organization mutation
│   │   ├── useUpdateOrganization.ts # Update organization mutation
│   │   ├── useDeleteOrganization.ts # Delete organization mutation
│   │   ├── useInviteMember.ts       # Invite member mutation
│   │   ├── useMembers.ts            # Fetch organization members
│   │   └── useDeleteMember.ts       # Delete member mutation
│   ├── lib/
│   │   ├── supabase.ts              # Supabase client initialization
│   │   ├── schemas.ts               # Zod validation schemas
│   │   └── utils.ts                 # Utility functions (cn, formatDate, etc.)
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── SignInPage.tsx       # User sign-in
│   │   │   └── SignUpPage.tsx       # User registration
│   │   ├── DashboardPage.tsx        # Organizations list
│   │   ├── CreateOrgPage.tsx        # Create organization
│   │   ├── OrgDetailPage.tsx        # Organization details + members
│   │   └── NotFoundPage.tsx         # 404 error page
│   ├── providers/
│   │   ├── AuthProvider.tsx         # Authentication context
│   │   ├── QueryProvider.tsx        # React Query provider
│   │   └── ThemeProvider.tsx        # Theme context (dark/light)
│   ├── router/
│   │   ├── index.tsx                # Routes configuration
│   │   ├── ProtectedRoute.tsx       # Auth-protected route wrapper
│   │   └── GuestRoute.tsx           # Guest-only route wrapper
│   ├── types/
│   │   └── index.ts                 # TypeScript type definitions
│   ├── App.tsx                      # Root app component
│   ├── main.tsx                     # Entry point
│   └── index.css                    # Global styles + Tailwind imports
├── public/                          # Static assets
├── index.html                       # HTML template
├── vite.config.ts                   # Vite configuration
├── tailwind.config.ts               # Tailwind CSS configuration
├── tsconfig.json                    # TypeScript configuration
├── package.json                     # Dependencies and scripts
└── vercel.json                      # Vercel deployment config
```

## 🔐 Authentication Flow

### Sign Up
1. User enters email, password, and full name
2. Form validated with Zod schema
3. `supabase.auth.signUp()` creates user
4. Trigger creates profile in `profiles` table
5. If email confirmation enabled → show "Check email" screen
6. If disabled → redirect to dashboard

### Sign In
1. User enters email and password
2. Form validated with Zod schema
3. `supabase.auth.signInWithPassword()` authenticates
4. Session stored in localStorage
5. `AuthProvider` updates context
6. Redirect to dashboard or original destination

### Session Management
- `AuthProvider` monitors auth state changes
- Session automatically restored on page load
- Protected routes check session before rendering
- Guest routes redirect authenticated users

## 📊 Data Fetching Architecture

### React Query Hooks Pattern
All data fetching uses React Query for:
- Automatic caching
- Background refetching
- Optimistic updates
- Loading and error states

### Query Keys Structure
```typescript
['organizations']              // All organizations
['organization', id]           // Single organization
['members', orgId]             // Organization members
['profile', userId]            // User profile
```

### Example Hook (useOrganizations)
```typescript
export function useOrganizations() {
  return useQuery<Organization[]>({
    queryKey: ['organizations'],
    queryFn: async () => {
      // Get fresh session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No active session')
      
      // Fetch organizations
      const { data: orgs } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false })
      
      // Fetch member counts
      const { data: members } = await supabase
        .from('organization_members')
        .select('organization_id')
      
      // Join client-side and return
      return orgs.map(org => ({
        ...org,
        member_count: members.filter(m => m.organization_id === org.id).length
      }))
    }
  })
}
```

## 🎨 UI/UX Features

### Theme Switcher
- Dark/light mode toggle in sidebar
- System preference detection
- Smooth icon rotation/scale animations
- Persistent preference in localStorage

### Animations
- **Card hover**: Lift effect with `translateY(-4px)` and shadow
- **Button interactions**: Scale on hover (105%) and active (95%)
- **Page transitions**: Fade-in and slide-in on mount
- **Loading skeletons**: Animated placeholders with fade-in

### Responsive Design
- **Desktop**: Full sidebar navigation
- **Mobile**: Hamburger menu with slide-out drawer
- **Touch-friendly**: Larger tap targets on mobile
- **Breakpoints**: Tailwind's default (sm: 640px, md: 768px, lg: 1024px)

### Accessibility
- ARIA labels on interactive elements
- Screen reader support for search and errors
- Keyboard navigation (Tab, Enter, Space)
- Focus visible states
- Semantic HTML structure
- WCAG 2.1 AA compliance

## 🔄 State Management

### Server State (React Query)
- Organizations list and details
- Members list
- User profile
- Authentication session

### Local State (React Hooks)
- Form inputs (React Hook Form)
- UI toggles (mobile menu, modals)
- Search/filter terms
- Loading/error states

### Global State (Context)
- Authentication (user, session, loading)
- Theme preference (dark/light)
- React Query cache

## 📝 Form Validation Schemas

### Sign Up Schema
```typescript
{
  email: string (email format),
  password: string (min 8 chars),
  fullName: string (1-100 chars)
}
```

### Sign In Schema
```typescript
{
  email: string (email format),
  password: string (min 1 char)
}
```

### Organization Schema (Discriminated Union)
```typescript
// School
{
  name: string (1-100 chars),
  type: 'school',
  school_district: string (required)
}

// Other types
{
  name: string (1-100 chars),
  type: 'nonprofit' | 'business' | 'government' | 'startup',
  school_district: string (optional)
}
```

### Member Invitation Schema
```typescript
{
  email: string (email format),
  role: 'admin' | 'member'
}
```

## 🚀 Build & Deploy

### Development
```bash
npm install
npm run dev          # Start dev server on http://localhost:5173
```

### Production Build
```bash
npm run build        # TypeScript compile + Vite build
npm run preview      # Preview production build locally
```

### Environment Variables
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Deployment (Vercel)
- Auto-deploys from `main` branch
- Environment variables set in Vercel dashboard
- Build command: `npm run build`
- Output directory: `dist`
- Framework: Vite

## 🎯 Key Features

✅ User authentication (email/password)
✅ Organization CRUD operations
✅ Member invitation system
✅ Admin role management
✅ Dark/light theme with animations
✅ Responsive mobile-first design
✅ Real-time data synchronization
✅ Optimistic UI updates
✅ Form validation with helpful errors
✅ Loading states and error handling
✅ Accessible keyboard navigation
✅ SEO-friendly routing

## 📦 Bundle Size Optimization

- Tree-shaking with Vite
- Code splitting by route
- Lazy loading for heavy components
- Optimized Tailwind CSS (PurgeCSS)
- Compressed assets in production

## 🔧 Development Best Practices

- TypeScript strict mode enabled
- ESLint for code quality
- Prettier for code formatting (if configured)
- Component-based architecture
- Custom hooks for reusability
- Separation of concerns (UI/logic/data)
- Consistent naming conventions
- Comprehensive error handling
