import { Badge } from '@/components/ui/badge'
import type { MemberStatus } from '@/types'

interface MemberStatusBadgeProps {
  status: MemberStatus
}

export function MemberStatusBadge({ status }: MemberStatusBadgeProps) {
  return (
    <Badge variant={status === 'active' ? 'green' : 'yellow'}>
      {status === 'active' ? 'Active' : 'Invited'}
    </Badge>
  )
}
