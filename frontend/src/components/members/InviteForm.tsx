import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { InviteMemberSchema, type InviteMemberInput } from '@/lib/schemas'
import { useInviteMember } from '@/hooks/useInviteMember'

interface InviteFormProps {
  orgId: string
}

export function InviteForm({ orgId }: InviteFormProps) {
  const { toast } = useToast()
  const mutation = useInviteMember(orgId)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteMemberInput>({
    resolver: zodResolver(InviteMemberSchema),
  })

  function onSubmit(data: InviteMemberInput) {
    mutation.mutate(
      { organization_id: orgId, email: data.email },
      {
        onSuccess: () => {
          toast({ title: 'Invitation sent', description: `Invited ${data.email} to this organization.` })
          reset()
        },
        onError: (err) => {
          toast({ variant: 'destructive', title: 'Invitation failed', description: err.message })
        },
      }
    )
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="invite-email">Email Address</Label>
        <div className="flex gap-2">
          <Input
            id="invite-email"
            type="email"
            placeholder="member@example.com"
            maxLength={254}
            {...register('email')}
            aria-invalid={!!errors.email}
            className="flex-1"
          />
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Invite
          </Button>
        </div>
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
    </form>
  )
}
