import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MemberStatusBadge } from './MemberStatusBadge'
import { useMembers } from '@/hooks/useMembers'
import { formatDate } from '@/lib/utils'

interface MemberListProps {
  orgId: string
}

export function MemberList({ orgId }: MemberListProps) {
  const { data: members, isLoading, isError, refetch } = useMembers(orgId)

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="text-sm">Failed to load members.</span>
        <Button variant="outline" size="sm" onClick={() => void refetch()} className="ml-auto">
          Retry
        </Button>
      </div>
    )
  }

  if (!members || members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No members yet. Invite your first member below.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Email</th>
            <th className="pb-2 pr-4 font-medium">Status</th>
            <th className="pb-2 pr-4 font-medium">Role</th>
            <th className="pb-2 font-medium">Invited</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {members.map((member) => (
            <tr key={member.id}>
              <td className="py-3 pr-4 text-foreground">{member.email}</td>
              <td className="py-3 pr-4">
                <MemberStatusBadge status={member.status} />
              </td>
              <td className="py-3 pr-4 capitalize text-foreground">{member.role}</td>
              <td className="py-3 text-muted-foreground">{formatDate(member.invited_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
