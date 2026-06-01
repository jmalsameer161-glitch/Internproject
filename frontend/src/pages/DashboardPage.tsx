import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Building2, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { OrgCard } from '@/components/organizations/OrgCard'
import { useOrganizations } from '@/hooks/useOrganizations'

export function DashboardPage() {
  const navigate = useNavigate()
  const { data: organizations, isLoading, isError, refetch } = useOrganizations()
  const [searchTerm, setSearchTerm] = useState('')

  const filtered = useMemo(() => {
    if (!organizations) return []
    if (!searchTerm.trim()) return organizations
    return organizations.filter((org) =>
      org.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [organizations, searchTerm])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Organizations</h1>
        <Button onClick={() => navigate('/organizations/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Organization
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search organizations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          maxLength={100}
          className="pl-9"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex items-center gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm">Failed to load organizations.</span>
          <Button variant="outline" size="sm" onClick={() => void refetch()} className="ml-auto">
            Retry
          </Button>
        </div>
      )}

      {/* Empty — no orgs at all */}
      {!isLoading && !isError && organizations?.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground" />
          <div>
            <p className="font-medium text-foreground">No organizations yet</p>
            <p className="text-sm text-muted-foreground">Create your first organization to get started.</p>
          </div>
          <Button onClick={() => navigate('/organizations/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Organization
          </Button>
        </div>
      )}

      {/* Empty — search no results */}
      {!isLoading && !isError && organizations && organizations.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground py-4">
          No organizations match &ldquo;{searchTerm}&rdquo;.
        </p>
      )}

      {/* List */}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((org) => (
            <OrgCard key={org.id} org={org} />
          ))}
        </div>
      )}
    </div>
  )
}
