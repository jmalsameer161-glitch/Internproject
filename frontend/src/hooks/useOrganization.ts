import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Organization } from '@/types'

export function useOrganization(id: string | undefined) {
  return useQuery<Organization | null>({
    queryKey: ['organization', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('organizations_with_member_count')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data as Organization | null
    },
    enabled: !!id,
  })
}
