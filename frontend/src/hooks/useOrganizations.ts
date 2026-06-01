import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Organization } from '@/types'

export function useOrganizations() {
  return useQuery<Organization[]>({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations_with_member_count')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Organization[]
    },
  })
}
