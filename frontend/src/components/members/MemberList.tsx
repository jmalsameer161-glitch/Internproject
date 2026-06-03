import { AlertCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MemberStatusBadge } from './MemberStatusBadge'
import { useMembers } from '@/hooks/useMembers'
import { useDeleteMember } from '@/hooks/useDeleteMember'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/utils'

interface MemberListProps {
  orgId: string
}

export function MemberList({ orgId }: MemberListProps) {
  const { data: members, isLoading, isError, refetch } = useMembers(orgId)
  const deleteMember = useDeleteMember(orgId)
  const { toast } = useToast()

  function handleDelete(memberId: string, email: string) {
    if (!window.confirm(`Remove ${email} from this organization?`)) return
    deleteMember.mutate(memberId, {
      onSuccess: () => {
        toast({ title: 'Member removed', description: `${email} has been removed.` })
      },
      onError: (err) => {
        toast({ title: 'Delete failed', description: err.message, variant: 'destructive' })
      },
    })
  }

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
            <th className="pb-2 pr-4 font-medium">Invited</th>
            <th className="pb-2 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {members.map((member) => (
            <tr key={member.id} className="group">
              <td className="py-3 pr-4 text-foreground">{member.email}</td>
              <td className="py-3 pr-4">
                <MemberStatusBadge status={member.status} />
              </td>
              <td className="py-3 pr-4 capitalize text-foreground">{member.role}</td>
              <td className="py-3 pr-4 text-muted-foreground">{formatDate(member.invited_at)}</td>
              <td className="py-3 text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-opacity"
                  onClick={() => handleDelete(member.id, member.email)}
                  disabled={deleteMember.isPending}
                  aria-label={`Remove ${member.email}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
