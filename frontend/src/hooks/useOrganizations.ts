import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Organization } from '@/types'

export function useOrganizations() {
  return useQuery<Organization[]>({
    queryKey: ['organizations'],
    queryFn: async () => {
      // Ensure we have a fresh session before querying
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!session) throw new Error('No active session')
      
      // Query organizations table directly
      const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false })
      if (orgError) throw orgError
      
      if (!orgs || orgs.length === 0) return []
      
      // Get member counts for all orgs
      const { data: members, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id')
      
      if (memberError) throw memberError
      
      // Count members per org
      const memberCounts = new Map<string, number>()
      if (members) {
        for (const m of members) {
          memberCounts.set(m.organization_id, (memberCounts.get(m.organization_id) || 0) + 1)
        }
      }
      
      // Attach member_count to each org
      return orgs.map(org => ({
        ...org,
        member_count: memberCounts.get(org.id) || 0
      })) as Organization[]
    },
  })
}
