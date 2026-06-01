# Requirements Document

## Introduction

The Admin Organization Dashboard is a production-grade web application that allows administrators to manage organizations and their members. Admins authenticate via email and password, create and browse organizations, and invite members to those organizations. The application is built with React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack React Query, and Supabase (Postgres, Auth, Edge Functions, RLS). It supports dark mode and provides comprehensive loading, empty, and error states throughout.

## Glossary

- **Admin**: An authenticated user whose `profiles.is_admin` flag is `true`.
- **Dashboard**: The protected web application accessible only to authenticated Admins.
- **Auth_Service**: The Supabase Auth subsystem responsible for sign-up, sign-in, and session management.
- **Organization**: A named entity of a specific type (School, Nonprofit, Business, Government, or Startup) created by an Admin.
- **Organization_Directory**: The page that lists all Organizations created by the signed-in Admin.
- **Org_Detail_Page**: The page that displays a single Organization's metadata and its Members list, and provides the invite form.
- **Member**: A person associated with an Organization, identified by email address, with a status of `invited` or `active`.
- **Invitation**: A DB record in `organization_members` representing a pending or accepted membership.
- **Edge_Function**: A Deno-based Supabase Edge Function that runs server-side validation and database mutations.
- **Create_Org_Function**: The `create-organization` Edge Function.
- **Invite_Member_Function**: The `invite-member` Edge Function.
- **Validator**: The client-side and server-side Zod schema validation layer.
- **RLS**: Row-Level Security policies on Supabase Postgres tables.
- **Query_Client**: The TanStack React Query client managing server state, caching, and cache invalidation.
- **Router**: React Router v6 managing client-side navigation.
- **Theme_Provider**: The `next-themes` provider controlling light/dark mode.
- **Profile_Trigger**: A Supabase database trigger that automatically inserts a row into `profiles` when a new user is created in `auth.users`.
- **JWT**: The JSON Web Token issued by the Auth_Service and included in the `Authorization: Bearer` header of all Edge Function requests.

---

## Requirements

### Requirement 1: Admin Authentication — Sign-Up

**User Story:** As a new admin, I want to create an account with my email and password, so that I can access the dashboard.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a sign-up screen accessible at the `/sign-up` route.
2. WHEN an admin submits the sign-up form with a valid email and password, THE Auth_Service SHALL create a new user account, sign the admin in automatically, and THE Router SHALL redirect the admin to the Organization Directory.
3. WHEN an admin submits the sign-up form with an email that is already registered, THE Dashboard SHALL display an inline error message indicating the email is already in use.
4. IF the sign-up form is submitted with an empty email field, THEN THE Validator SHALL display an inline field-level error on the email field before the form is submitted to the Auth_Service.
5. IF the sign-up form is submitted with an empty password field, THEN THE Validator SHALL display an inline field-level error on the password field before the form is submitted to the Auth_Service.
6. IF the sign-up form is submitted with a password shorter than 8 characters, THEN THE Validator SHALL display an inline error on the password field stating the minimum password length requirement.
7. WHILE an already-authenticated admin navigates to `/sign-up`, THE Router SHALL redirect the admin to the Organization Directory.
8. WHEN a new user account is created in `auth.users`, THE Profile_Trigger SHALL automatically insert a corresponding row into `profiles` with `id` equal to the new user's `auth.uid()`, `is_admin` set to `true`, and `full_name` set to `null`.
9. THE Dashboard SHALL provide a link from the sign-up screen to the sign-in screen for users who already have an account.

---

### Requirement 2: Admin Authentication — Sign-In

**User Story:** As a returning admin, I want to sign in with my email and password, so that I can access my dashboard.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a sign-in screen accessible at the `/sign-in` route.
2. WHEN an admin submits the sign-in form with valid credentials, THE Auth_Service SHALL establish an authenticated session and THE Router SHALL redirect the admin to the Organization Directory.
3. WHEN an admin submits the sign-in form with invalid credentials, THE Dashboard SHALL display an error message indicating the credentials are incorrect.
4. IF the sign-in form is submitted with an empty email field, THEN THE Validator SHALL display an inline field-level error on the email field before the form is submitted to the Auth_Service.
5. IF the sign-in form is submitted with an empty password field, THEN THE Validator SHALL display an inline field-level error on the password field before the form is submitted to the Auth_Service.
6. WHILE an already-authenticated admin navigates to `/sign-in`, THE Router SHALL redirect the admin to the Organization Directory.
7. WHEN an admin has submitted invalid credentials 5 or more consecutive times, THE Dashboard SHALL display a message indicating that further attempts may be rate-limited by the Auth_Service.
8. THE Dashboard SHALL provide a link from the sign-in screen to the sign-up screen for users who do not yet have an account.

---

### Requirement 3: Protected Layout and Route Guarding

**User Story:** As a system operator, I want all admin routes to be protected, so that unauthenticated users cannot access the dashboard.

#### Acceptance Criteria

1. WHILE an admin is not authenticated, THE Router SHALL redirect any request to a protected route to `/sign-in`.
2. WHILE an admin is authenticated, THE Router SHALL allow access to all protected routes.
3. WHEN an unauthenticated user navigates directly to a protected URL, THE Router SHALL redirect the user to `/sign-in` and preserve the originally requested URL as a redirect parameter.
4. WHEN the admin successfully signs in after being redirected from a protected URL, THE Router SHALL redirect the admin to the originally requested URL.
5. THE Dashboard SHALL display the signed-in admin's `profiles.full_name` in the persistent navigation area on all protected pages; IF `profiles.full_name` is empty or null, THEN THE Dashboard SHALL display the admin's email address instead.
6. THE Dashboard SHALL render a sign-out control in the persistent navigation area on all protected pages such that the control is visible and not hidden by any overlay or collapsed state.
7. WHEN the admin activates the sign-out control, THE Auth_Service SHALL terminate the session.
8. WHEN the Auth_Service successfully terminates the session, THE Router SHALL redirect the admin to `/sign-in`.
9. IF the Auth_Service returns an error when terminating the session, THEN THE Dashboard SHALL display an error message indicating that sign-out failed and the admin remains on the current page.

---

### Requirement 4: Organization Creation

**User Story:** As an admin, I want to create a new organization with a name and type, so that I can manage its members.

#### Acceptance Criteria

1. WHEN the admin clicks the "Create Organization" action in the Organization Directory, THE Router SHALL navigate to the organization creation form.
2. THE organization creation form SHALL include a required `name` text field (maximum 100 characters) and a required `type` select field with exactly the options: School, Nonprofit, Business, Government, Startup.
3. WHEN the admin selects `School` as the organization type, THE Dashboard SHALL display a `school_district` text field as an additional required field.
4. WHEN the admin selects any type other than `School`, THE Dashboard SHALL hide the `school_district` field and clear its value.
5. IF the organization creation form is submitted with an empty `name` field, THEN THE Validator SHALL display an inline error on the `name` field.
6. IF the organization creation form is submitted with a `name` exceeding 100 characters, THEN THE Validator SHALL display an inline error on the `name` field indicating the maximum length.
7. IF the organization creation form is submitted with no `type` selected, THEN THE Validator SHALL display an inline error on the `type` field.
8. IF the organization creation form is submitted with `type` equal to `School` and an empty `school_district` field, THEN THE Validator SHALL display an inline error on the `school_district` field.
9. WHEN the admin submits a valid organization creation form, THE Dashboard SHALL call the Create_Org_Function with the form data including `name`, `type`, and `school_district` (if applicable), and SHALL include the admin's JWT in the `Authorization: Bearer` header.
10. WHEN the Create_Org_Function receives a request, THE Create_Org_Function SHALL extract and verify the JWT from the `Authorization` header and return a 401 Unauthorized error if the token is missing or invalid.
11. WHEN the Create_Org_Function receives a valid payload from a caller whose `profiles.is_admin` is `false`, THE Create_Org_Function SHALL return a 403 Forbidden error.
12. WHEN the Create_Org_Function successfully inserts the Organization, THE Create_Org_Function SHALL return the created Organization record with a 201 status.
13. WHEN the Create_Org_Function returns a 201 response, THE Query_Client SHALL invalidate the Organization Directory query so the new Organization appears in the list without a full page reload.
14. WHEN the Create_Org_Function returns a 201 response, THE Dashboard SHALL display a success confirmation message to the admin.
15. IF the Create_Org_Function returns an error, THEN THE Dashboard SHALL display an error message indicating the cause of the failure.
16. THE organization creation form SHALL provide a cancel action that navigates the admin back to the Organization Directory without saving any data.

---

### Requirement 5: Organization Directory

**User Story:** As an admin, I want to see a list of all organizations I have created, so that I can navigate to and manage them.

#### Acceptance Criteria

1. THE Organization_Directory SHALL display all Organizations whose `created_by` matches the signed-in admin's user ID.
2. THE Organization_Directory SHALL display each Organization's name, type (rendered as a colored badge), member count, and creation date formatted as YYYY-MM-DD.
3. THE Organization_Directory SHALL display Organizations sorted by creation date in descending order (most recently created first) by default.
4. WHEN the admin clicks an Organization row, THE Router SHALL navigate to the Org_Detail_Page for that Organization.
5. WHILE the Organization list is loading, THE Organization_Directory SHALL display a loading indicator.
6. WHEN the Organization list loads successfully with zero Organizations, THE Organization_Directory SHALL display an empty-state message with a prompt to create the first Organization.
7. IF the Organization list query fails, THEN THE Organization_Directory SHALL display an error message with a retry action that re-triggers the Organization list query.
8. THE Organization_Directory SHALL provide a search input that filters the displayed list to Organizations whose name contains the search string (case-insensitive), with the search limited to a maximum of 100 characters.
9. WHEN the search input is cleared, THE Organization_Directory SHALL display the full unfiltered list.
10. IF the admin has entered a search string that matches no Organizations, THEN THE Organization_Directory SHALL display an empty-state message indicating no results were found for the search term.

---

### Requirement 6: Organization Detail Page

**User Story:** As an admin, I want to view the details and members of a specific organization, so that I can manage its membership.

#### Acceptance Criteria

1. THE Org_Detail_Page SHALL display the Organization's name, type, and creation date.
2. IF the Organization's type is `school`, THEN THE Org_Detail_Page SHALL display the Organization's `school_district` value alongside the other organization details.
3. WHEN the Member list loads successfully, THE Org_Detail_Page SHALL display a list of all Members associated with the Organization, showing each Member's email, status (`invited` or `active`), role, and invitation date.
4. WHILE the Member list is loading, THE Org_Detail_Page SHALL display a loading indicator.
5. WHEN the Member list loads successfully with zero Members, THE Org_Detail_Page SHALL display an empty-state message.
6. IF the Member list query fails, THEN THE Org_Detail_Page SHALL display an error message indicating that the member list could not be loaded, and a retry action that re-triggers the Member list query.
7. IF the Organization data query fails, THEN THE Org_Detail_Page SHALL display an error message indicating that the organization could not be loaded, and a retry action that re-triggers the Organization data query.
8. WHEN an admin navigates to an Org_Detail_Page for an Organization not owned by the admin, THE Dashboard SHALL display an access-denied message and a navigation action returning the admin to the Organization Directory.
9. THE Org_Detail_Page SHALL provide a back navigation link that returns the admin to the Organization Directory.
10. WHEN the Invite_Member_Function successfully inserts the Invitation record, THE Invite_Member_Function SHALL set the `role` field to `member` and the `joined_at` field to `null` by default.

---

### Requirement 7: Member Invitations

**User Story:** As an admin, I want to invite a person to an organization by email, so that they can become a member.

#### Acceptance Criteria

1. THE Org_Detail_Page SHALL provide an invite form with a required email address field.
2. IF the invite form is submitted with an empty email address, a malformed email address, or an email address exceeding 254 characters, THEN THE Validator SHALL display an inline error on the email field indicating the specific validation failure.
3. WHEN the admin submits a valid invite form, THE Dashboard SHALL call the Invite_Member_Function with the organization ID and the email address, and SHALL include the admin's JWT in the `Authorization: Bearer` header.
4. WHEN the Invite_Member_Function receives a request, THE Invite_Member_Function SHALL extract and verify the JWT from the `Authorization` header and return a 401 Unauthorized error if the token is missing or invalid.
5. WHEN the Invite_Member_Function receives a request with a valid JWT, THE Invite_Member_Function SHALL validate the payload using a Zod schema and return a 400 error with field-level messages if validation fails.
6. WHEN the Invite_Member_Function receives a valid payload from a caller who is not the owner of the specified Organization, THE Invite_Member_Function SHALL return a 403 Forbidden error.
7. WHEN the Invite_Member_Function detects that an Invitation record already exists for the given email within the same Organization, regardless of that Invitation's current status, THE Invite_Member_Function SHALL return a 409 Conflict error.
8. WHEN the Invite_Member_Function successfully inserts the Invitation record, THE Invite_Member_Function SHALL return the created Invitation with a 201 status and set the Member's status to `invited`.
9. WHEN the Invite_Member_Function returns a 201 response, THE Query_Client SHALL invalidate the Member list query so the new Member appears in the list without a full page reload.
10. WHEN the Invite_Member_Function returns a 201 response, THE Dashboard SHALL display a confirmation message indicating the invitation was sent to the submitted email address.
11. IF the Invite_Member_Function returns a 409 error, THEN THE Dashboard SHALL display a message indicating the email has already been invited to this Organization.
12. IF the Invite_Member_Function returns any error other than 409, THEN THE Dashboard SHALL display an error message that identifies the reason for the failure as returned by the Invite_Member_Function.

---

### Requirement 8: Row-Level Security

**User Story:** As a system operator, I want database access to be restricted by RLS policies, so that admins can only read and write their own data.

#### Acceptance Criteria

1. THE RLS SHALL be enabled on the `profiles`, `organizations`, and `organization_members` tables.
2. WHILE RLS is active, THE RLS SHALL deny any unauthenticated request to select, insert, update, or delete rows on any of the three tables.
3. WHILE RLS is active, THE RLS SHALL allow an authenticated user to select only the `profiles` row where `id` equals the user's own `auth.uid()`.
4. WHILE RLS is active, THE RLS SHALL allow an authenticated admin (where `profiles.is_admin = true`) to select only `organizations` rows where `created_by` equals the admin's `auth.uid()`.
5. WHILE RLS is active, THE RLS SHALL allow an authenticated admin to select only `organization_members` rows belonging to Organizations where `created_by` equals the admin's `auth.uid()`.
6. WHILE RLS is active, THE RLS SHALL prevent any authenticated user from selecting, inserting, updating, or deleting rows in `organizations` or `organization_members` that do not belong to that user.
7. THE Create_Org_Function and Invite_Member_Function SHALL use the Supabase service-role key for privileged mutations and SHALL enforce ownership checks in application logic before performing any write operation.
8. IF the Create_Org_Function or Invite_Member_Function ownership check fails, THEN the function SHALL return a 403 Forbidden error without performing any database mutation.

---

### Requirement 9: Dark Mode

**User Story:** As an admin, I want to toggle between light and dark mode, so that I can use the dashboard comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a theme toggle control in the persistent navigation area.
2. THE Theme_Provider SHALL apply `light` as the default theme on first load when no stored preference exists.
3. WHEN the admin activates the theme toggle, THE Theme_Provider SHALL switch the active theme between `light` and `dark`.
4. THE Theme_Provider SHALL persist the admin's theme preference in `localStorage` and restore it on subsequent page loads.
5. WHILE the `dark` theme is active, THE Dashboard SHALL apply dark-mode styles to all pages and components visible to the admin.

---

### Requirement 10: Loading, Empty, and Error States

**User Story:** As an admin, I want clear feedback during data loading and when errors occur, so that I always understand the state of the application.

#### Acceptance Criteria

1. WHILE any data-fetching query is in a pending state, THE Dashboard SHALL display a contextual loading indicator (skeleton or spinner) in the section that depends on that query's result.
2. WHEN a data-fetching query returns an empty result set, THE Dashboard SHALL display a contextual empty-state message that includes a prompt describing the action the admin can take to populate the list.
3. IF a data-fetching query returns an error, THEN THE Dashboard SHALL display a human-readable error message in the relevant section that identifies the failed operation.
4. THE Dashboard SHALL provide a retry action for every failed data-fetching query that re-triggers that specific query.
5. WHILE a form submission mutation is in flight, THE Dashboard SHALL disable the submit button and display a loading indicator on it to prevent duplicate submissions.

---

### Requirement 11: Navigation and 404 Handling

**User Story:** As an admin, I want the app to handle unknown URLs gracefully and provide clear navigation, so that I never get stuck on a broken page.

#### Acceptance Criteria

1. WHEN a user navigates to any URL that does not match a defined route, THE Router SHALL render a 404 Not Found page.
2. THE 404 Not Found page SHALL display a message indicating the page does not exist and SHALL provide a navigation link to the Organization Directory.
3. THE Dashboard SHALL display a breadcrumb or page title on the Org_Detail_Page that identifies the current organization by name.
4. THE Org_Detail_Page SHALL provide a back navigation link that returns the admin to the Organization Directory without requiring the browser back button.

---

### Requirement 12: Project Configuration and Repository Standards

**User Story:** As a developer reviewing this project, I want the repository to follow the required configuration standards, so that I can clone, install, and run it in under 15 minutes.

#### Acceptance Criteria

1. THE project SHALL include a `tsconfig.json` with `strict: true` enabled so that all TypeScript files are compiled in strict mode.
2. THE project SHALL include a `.env.example` file at the repository root that documents every required environment variable (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) with a comment describing where each value is found in the Supabase dashboard.
3. THE project SHALL include a `supabase/migrations/` directory containing numbered SQL migration files that recreate the full schema, RLS policies, and Profile_Trigger on a fresh Supabase project.
4. THE project SHALL include a `README.md` that documents: setup steps, the two-branch Git workflow, environment variable configuration, and seeded test credentials for the deployed app.
5. THE `.env` file SHALL be listed in `.gitignore` and SHALL never be committed to the repository.
6. THE `SUPABASE_SERVICE_ROLE_KEY` SHALL only be configured as a Supabase Edge Function secret and SHALL never appear in the client-side bundle or be prefixed with `VITE_`.

---

### Requirement 13: Server State Management Standards

**User Story:** As a developer reviewing this project, I want all server state to be managed consistently, so that the codebase is predictable and maintainable.

#### Acceptance Criteria

1. THE Dashboard SHALL use the Query_Client (TanStack React Query) for all data fetching operations — no raw `useEffect` + `fetch` or `useEffect` + Supabase client calls SHALL be used for loading server data.
2. THE Dashboard SHALL use React Hook Form with a Zod resolver for every form in the application, including the sign-up form, sign-in form, organization creation form, and member invite form.
3. WHEN a mutation (create org, invite member) succeeds, THE Query_Client SHALL invalidate only the specific query keys affected by that mutation rather than invalidating all queries.
4. THE Dashboard SHALL use Lucide React as the sole icon library — no other icon library SHALL be introduced.
