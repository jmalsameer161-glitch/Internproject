import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Organization, OrgType } from '@/types'

export interface UpdateOrgInput {
  id: string
  name: string
  type: OrgType
  school_district?: string | null
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient()

  return useMutation<Organization, Error, UpdateOrgInput>({
    mutationFn: async ({ id, name, type, school_district }) => {
      const { data, error } = await supabase
        .from('organizations')
        .update({ name, type, school_district: school_district ?? null })
        .eq('id', id)
        .select()
      if (error) throw new Error(error.message)
      if (!data || data.length === 0) throw new Error('Update failed: organization not found')
      return data[0] as Organization
    },
    onSuccess: (updated) => {
      // Invalidate both the list and the single org query
      void queryClient.invalidateQueries({ queryKey: ['organizations'] })
      void queryClient.invalidateQueries({ queryKey: ['organization', updated.id] })
    },
  })
}
