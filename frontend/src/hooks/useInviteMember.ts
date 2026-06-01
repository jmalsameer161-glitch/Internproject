import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { getEdgeFunctionUrl, getAuthHeader } from '@/lib/utils'
import type { OrganizationMember } from '@/types'

interface InviteMemberPayload {
  organization_id: string
  email: string
}

export function useInviteMember(orgId: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()

  return useMutation<OrganizationMember, Error, InviteMemberPayload>({
    mutationFn: async (payload: InviteMemberPayload) => {
      const res = await fetch(getEdgeFunctionUrl('invite-member'), {
        method: 'POST',
        headers: getAuthHeader(session?.access_token ?? ''),
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const message =
          res.status === 409
            ? 'This email has already been invited to this organization'
            : (body.error ?? `Request failed with status ${res.status}`)
        throw new Error(message)
      }
      return res.json() as Promise<OrganizationMember>
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['members', orgId] })
    },
  })
}
