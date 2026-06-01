export type OrgType = 'school' | 'nonprofit' | 'business' | 'government' | 'startup'
export type MemberStatus = 'invited' | 'active'
export type MemberRole = 'admin' | 'member'

export interface Profile {
  id: string
  full_name: string | null
  is_admin: boolean
  created_at: string
}

export interface Organization {
  id: string
  name: string
  type: OrgType
  school_district: string | null
  created_by: string
  created_at: string
  member_count?: number
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string | null
  email: string
  status: MemberStatus
  role: MemberRole
  invited_at: string
  joined_at: string | null
}
