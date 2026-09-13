export const ACTIVE_ORG_COOKIE = 'orgarq_active_org_id'

export interface UserOrganizationItem {
  id: string
  name: string
  slug: string
  logo_url: string | null
  owner_id: string
  is_owner: boolean
  role: string
  profile_id: string | null
  profile_name: string
  profile_color: string
}
