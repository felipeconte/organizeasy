import { getActiveOrganization } from '@/lib/server/active-org'
import { redirect } from 'next/navigation'
import { hasPermission } from '@/lib/server/guard'
import AccessDenied from '@/components/ui/AccessDenied'
import { getAccessProfilesAction } from '@/lib/actions/access-profiles'
import ProfilesManagementClient from '@/components/profiles/ProfilesManagementClient'

export const metadata = {
  title: 'Perfis de Acesso e Permissões | Organizeasy',
  description: 'Gerencie os perfis de acesso e configure permissões granulares por funcionalidade para a sua equipe.',
}

export default async function ProfilesSettingsPage() {
  const { user, activeOrg, isOwner, userPermissions } = await getActiveOrganization()

  if (!activeOrg) {
    redirect('/onboarding')
  }

  // Proteção de rota
  if (!hasPermission(isOwner, userPermissions, 'settings_profiles')) {
    return (
      <AccessDenied
        moduleName="Perfis de Acesso e Permissões"
        userProfileName={activeOrg.profile_name}
        userProfileColor={activeOrg.profile_color}
      />
    )
  }

  // Busca lista de perfis do escritório ativo
  const res = await getAccessProfilesAction(activeOrg.id)
  const profiles = res.success && res.profiles ? res.profiles : []

  return (
    <ProfilesManagementClient
      organizationId={activeOrg.id}
      officeName={activeOrg.name}
      initialProfiles={profiles}
      isOwner={isOwner}
      currentUserId={user.id}
    />
  )
}
