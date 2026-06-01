import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTheme } from 'next-themes'
import { Building2, LogOut, Moon, Sun, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const { user } = useAuth()
  const { data: profile } = useProfile(user?.id)
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  const displayName = profile?.full_name ?? user?.email ?? 'Admin'

  async function handleSignOut() {
    setSignOutError(null)
    const { error } = await supabase.auth.signOut()
    if (error) {
      setSignOutError('Sign out failed. Please try again.')
    } else {
      navigate('/sign-in')
    }
  }

  const navContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5">
        <Building2 className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold text-foreground">Admin Dashboard</span>
      </div>

      <Separator />

      {/* Nav links */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-accent hover:text-accent-foreground'
            )
          }
          onClick={() => setMobileOpen(false)}
        >
          <Building2 className="h-4 w-4" />
          Organizations
        </NavLink>


      </nav>

      <Separator />

      {/* Bottom section */}
      <div className="px-3 py-4 space-y-2">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </Button>

        {/* User info */}
        <div className="px-3 py-2 text-sm text-muted-foreground truncate">{displayName}</div>

        {/* Sign out */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-destructive hover:text-destructive"
          onClick={() => void handleSignOut()}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>

        {signOutError && (
          <p className="px-3 text-xs text-destructive">{signOutError}</p>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card dark:bg-card">
        {navContent}
      </aside>

      {/* Mobile hamburger */}
      <div className="md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="fixed left-4 top-4 z-50"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="fixed left-0 top-0 z-50 h-full w-64 border-r bg-card shadow-lg">
              {navContent}
            </aside>
          </>
        )}
      </div>
    </>
  )
}
