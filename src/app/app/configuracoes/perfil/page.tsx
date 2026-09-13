import { getActiveOrganization } from '@/lib/server/active-org'
import UserProfileSettingsClient, { UserProfileData } from '@/components/profile/UserProfileSettingsClient'

export default async function UserProfilePage() {
  const { supabase, user, activeOrg } = await getActiveOrganization()

  // 1. Busca perfil na tabela dedicada user_profiles
  const { data: dbProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const meta = user.user_metadata || {}

  const profileData: UserProfileData = {
    id: user.id,
    email: user.email || '',
    fullName: dbProfile?.full_name || dbProfile?.display_name || meta.full_name || meta.display_name || user.email?.split('@')[0] || 'Arquiteto',
    avatarUrl: dbProfile?.avatar_url || meta.avatar_url || null,
    phone: dbProfile?.phone || meta.phone || null,
    jobRole: dbProfile?.job_role || meta.job_role || null,
    cau: dbProfile?.cau || meta.cau || null,
    bio: dbProfile?.bio || meta.bio || null,
  }

  return (
    <UserProfileSettingsClient
      initialProfile={profileData}
      role={activeOrg?.role || 'collaborator'}
      profileName={activeOrg?.profile_name || (activeOrg?.is_owner ? 'Proprietário' : undefined)}
      profileColor={activeOrg?.profile_color || undefined}
    />
  )
}
