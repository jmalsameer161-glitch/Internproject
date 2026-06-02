import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Toaster } from '@/components/ui/toaster'

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      {/* On mobile, add pt-16 to push content below the fixed hamburger header */}
      <main className="flex-1 overflow-y-auto p-6 pt-16 md:pt-6">
        <Outlet />
      </main>
      <Toaster />
    </div>
  )
}
