import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Organization } from '@/types'

export function useOrganization(id: string | undefined) {
  return useQuery<Organization | null>({
    queryKey: ['organization', id],
    queryFn: async () => {
      if (!id) return null
      
      // Ensure we have a fresh session before querying
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!session) throw new Error('No active session')
      
      // Query organization table directly
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (orgError) throw orgError
      if (!org) return null
      
      // Get member count for this org
      const { count, error: countError } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', id)
      
      if (countError) throw countError
      
      return {
        ...org,
        member_count: count || 0
      } as Organization
    },
    enabled: !!id,
  })
}
