import { Badge } from '@/components/ui/badge'
import type { OrgType } from '@/types'

interface OrgTypeBadgeProps {
  type: OrgType
}

const typeConfig: Record<OrgType, { label: string; variant: 'blue' | 'green' | 'purple' | 'orange' | 'pink' }> = {
  school: { label: 'School', variant: 'blue' },
  nonprofit: { label: 'Nonprofit', variant: 'green' },
  business: { label: 'Business', variant: 'purple' },
  government: { label: 'Government', variant: 'orange' },
  startup: { label: 'Startup', variant: 'pink' },
}

export function OrgTypeBadge({ type }: OrgTypeBadgeProps) {
  const config = typeConfig[type]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
