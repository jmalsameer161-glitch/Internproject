import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { OrgTypeBadge } from './OrgTypeBadge'
import { formatDate } from '@/lib/utils'
import type { Organization } from '@/types'

interface OrgCardProps {
  org: Organization
}

export function OrgCard({ org }: OrgCardProps) {
  const navigate = useNavigate()

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md dark:hover:shadow-none dark:hover:border-primary"
      onClick={() => navigate(`/organizations/${org.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(`/organizations/${org.id}`)
      }}
      aria-label={`View ${org.name}`}
    >
      <CardContent className="flex items-center justify-between p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{org.name}</h3>
            <OrgTypeBadge type={org.type} />
          </div>
          <p className="text-sm text-muted-foreground">Created {formatDate(org.created_at)}</p>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{org.member_count ?? 0}</span>
        </div>
      </CardContent>
    </Card>
  )
}
