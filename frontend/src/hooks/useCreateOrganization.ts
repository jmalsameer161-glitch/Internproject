import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getEdgeFunctionUrl, getAuthHeader } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { CreateOrgInput } from '@/lib/schemas'
import type { Organization } from '@/types'

export function useCreateOrganization() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation<Organization, Error, CreateOrgInput>({
    mutationFn: async (data: CreateOrgInput) => {
      // Always get a fresh session/token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('You must be signed in to create an organization.')

      const res = await fetch(getEdgeFunctionUrl('create-organization'), {
        method: 'POST',
        headers: getAuthHeader(session.access_token),
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
