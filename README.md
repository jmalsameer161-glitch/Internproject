# Production-Minded Admin Dashboard

A modern, full-stack admin dashboard for managing organizations and their members, built with React, TypeScript, and Supabase.

![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🚀 Quick Links

- **Live Demo**: [https://production-minded-admin-dashboard-nine.vercel.app](https://production-minded-admin-dashboard-nine.vercel.app)
- **GitHub Repository**: [https://github.com/jmalsameer161-glitch/Internproject](https://github.com/jmalsameer161-glitch/Internproject)

## 📚 Documentation

- **[Frontend Documentation](./FRONTEND_SUMMARY.md)** - Detailed frontend architecture, components, and development guide
- **[Backend Documentation](./BACKEND_SUMMARY.md)** - Supabase database schema, RLS policies, and Edge Functions
- **[Changelog](./CHANGELOG.md)** - Version history and release notes

## ✨ Features

### Core Functionality
- 🔐 **User Authentication** - Email/password sign up and sign in
- 🏢 **Organization Management** - Create, read, update, and delete organizations
- 👥 **Member Management** - Invite and manage organization members
- 👨‍💼 **Admin Role System** - Permission-based access control
- 🔍 **Search & Filter** - Real-time organization search

### UI/UX
- 🎨 **Dark/Light Theme** - Smooth theme switching with animations
- 📱 **Fully Responsive** - Mobile-first design with touch support
- ✨ **Smooth Animations** - Card hover effects, page transitions, loading states
- ♿ **Accessible** - WCAG 2.1 compliant with ARIA labels and keyboard navigation
- 🎯 **Modern UI** - Clean, professional design with Shadcn/ui components

### Technical
- ⚡ **Real-time Updates** - Optimistic UI with React Query
- 🔒 **Row Level Security** - Database-level access control
- 🚀 **Edge Functions** - Serverless API endpoints
- 📊 **Type Safety** - Full TypeScript coverage
- 🧪 **Form Validation** - Zod schemas with helpful error messages

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Query** - Data fetching
- **React Hook Form + Zod** - Form management
- **Shadcn/ui** - Component library

### Backend
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Database
- **Row Level Security** - Access control
- **Edge Functions** - Serverless API
- **Deno** - JavaScript runtime

### Deployment
- **Vercel** - Frontend hosting
- **Supabase Cloud** - Backend hosting

## 📦 Project Structure

```
production-minded-admin-dashboard/
├── frontend/                      # React frontend application
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── hooks/                # Custom React hooks
│   │   ├── lib/                  # Utilities and config
│   │   ├── pages/                # Page components
│   │   ├── providers/            # Context providers
│   │   ├── router/               # Route configuration
│   │   └── types/                # TypeScript types
│   ├── supabase/
│   │   ├── functions/            # Edge Functions
│   │   └── migrations/           # Database migrations
│   └── package.json
├── FRONTEND_SUMMARY.md           # Detailed frontend docs
├── BACKEND_SUMMARY.md            # Detailed backend docs
├── CHANGELOG.md                  # Version history
└── README.md                     # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Vercel account (for deployment)

### 1. Clone the Repository
```bash
git clone https://github.com/jmalsameer161-glitch/Internproject.git
cd Internproject/frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables
Create a `.env` file in the `frontend` directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Database Migrations
1. Go to your Supabase project dashboard
2. Open SQL Editor
3. Run migrations in order:
   - `001_profiles.sql`
   - `002_organizations.sql`
   - `003_organization_members.sql`
   - `004_rls_policies.sql`

### 5. Deploy Edge Functions
```bash
# Install Supabase CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref your-project-id

# Deploy functions
supabase functions deploy create-organization
supabase functions deploy invite-member
```

### 6. Start Development Server
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📖 Usage

### Creating an Account
1. Navigate to `/sign-up`
2. Enter email, password, and full name
3. Confirm email (if email confirmation is enabled)
4. Sign in at `/sign-in`

### Managing Organizations
1. Click "Create Organization" on dashboard
2. Fill in organization details (name, type, district if school)
3. View organization details by clicking a card
4. Edit or delete from organization detail page

### Inviting Members
1. Open an organization
2. Click "Invite Member"
3. Enter email and select role (admin or member)
4. Member receives invitation

## 🔐 Security

- **Authentication**: Email/password with JWT tokens
- **Authorization**: Row Level Security policies
- **API Security**: Edge Functions verify ownership
- **Data Validation**: Client and server-side validation
- **HTTPS Only**: All connections encrypted
- **Environment Variables**: Secrets not exposed in code

## 🌐 Deployment

### Frontend (Vercel)
1. Push code to GitHub
2. Import repository in Vercel
3. Set environment variables
4. Deploy automatically on push to `main`

### Backend (Supabase)
1. Create Supabase project
2. Run migrations in SQL Editor
3. Deploy Edge Functions via CLI
4. Configure environment variables

See [FRONTEND_SUMMARY.md](./FRONTEND_SUMMARY.md) and [BACKEND_SUMMARY.md](./BACKEND_SUMMARY.md) for detailed deployment instructions.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention
Follow conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test additions or changes
- `chore:` - Build/tooling changes

## 📝 License

This project is licensed under the MIT License.

## 👤 Author

**jmalsameer161**
- GitHub: [@jmalsameer161-glitch](https://github.com/jmalsameer161-glitch)
- Email: jmalsameer161@gmail.com

## 🙏 Acknowledgments

- [Supabase](https://supabase.com/) - Backend infrastructure
- [Vercel](https://vercel.com/) - Frontend hosting
- [Shadcn/ui](https://ui.shadcn.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework
- [React Query](https://tanstack.com/query) - Data fetching library

## 📊 Project Stats

- **Lines of Code**: ~5,000+
- **Components**: 20+
- **Custom Hooks**: 10+
- **Database Tables**: 3
- **Edge Functions**: 2
- **Test Coverage**: N/A (not implemented)

## 🗺️ Roadmap

- [ ] Add unit and integration tests
- [ ] Implement email notifications
- [ ] Add bulk operations (delete multiple)
- [ ] Create organization templates
- [ ] Add analytics dashboard
- [ ] Implement audit logs
- [ ] Add export functionality (CSV/PDF)
- [ ] Create mobile app (React Native)

## 📞 Support

If you have any questions or need help, please:
1. Check the [documentation](./FRONTEND_SUMMARY.md)
2. Search existing [issues](https://github.com/jmalsameer161-glitch/Internproject/issues)
3. Open a new issue if needed

---

**Built with ❤️ by jmalsameer161**
