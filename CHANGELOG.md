# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-06-20

### Added
- Enhanced theme switcher with smooth rotation and scale animations
- Improved loading skeleton UI with detailed card-style placeholders
- Smooth hover animations for organization cards with lift effect
- Interactive button animations with scale transforms
- Comprehensive accessibility improvements with ARIA labels
- Screen reader support for search inputs and error messages
- Fade-in and slide-in animations for better user experience

### Changed
- Updated theme toggle button with enhanced visual feedback
- Improved organization card hover states with shadow transitions
- Enhanced error messages with proper ARIA live regions
- Better mobile responsive layout with animated transitions

### Fixed
- Environment variables encoding issue (were stored as ASCII codes)
- Session authentication timing in organization queries
- Organization loading after creation (RLS policies)
- Email input trimming on sign-in
- SignUp page email confirmation flow handling

## [1.0.0] - 2026-06-19

### Added
- Initial project setup with React + TypeScript + Vite
- Supabase authentication integration
- Organization management (CRUD operations)
- Member invitation system
- Dark/Light theme support
- Mobile responsive design
- RLS policies for data security
- Edge Functions for server-side operations

### Features
- User authentication (Sign in/Sign up)
- Profile management
- Organization creation and management
- Member invitations
- Admin role system
- Real-time database updates
