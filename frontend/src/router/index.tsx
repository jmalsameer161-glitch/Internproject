import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { GuestRoute } from './GuestRoute'
import { AppShell } from '@/components/layout/AppShell'
import { SignInPage } from '@/pages/auth/SignInPage'
import { SignUpPage } from '@/pages/auth/SignUpPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { CreateOrgPage } from '@/pages/CreateOrgPage'
import { OrgDetailPage } from '@/pages/OrgDetailPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/sign-in',
    element: (
      <GuestRoute>
        <SignInPage />
      </GuestRoute>
    ),
  },
  {
    path: '/sign-up',
    element: (
      <GuestRoute>
        <SignUpPage />
      </GuestRoute>
    ),
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'organizations/new', element: <CreateOrgPage /> },
          { path: 'organizations/:id', element: <OrgDetailPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
