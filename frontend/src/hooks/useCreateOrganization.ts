import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { getEdgeFunctionUrl, getAuthHeader } from '@/lib/utils'
import type { CreateOrgInput } from '@/lib/schemas'
import type { Organization } from '@/types'

export function useCreateOrganization() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { session } = useAuth()

  return useMutation<Organization, Error, CreateOrgInput>({
    mutationFn: async (data: CreateOrgInput) => {
      const res = await fetch(getEdgeFunctionUrl('create-organization'), {
        method: 'POST',
        headers: getAuthHeader(session?.access_token ?? ''),
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Request failed with status ${res.status}`)
      }
      return res.json() as Promise<Organization>
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations'] })
      navigate('/')
    },
  })
}
