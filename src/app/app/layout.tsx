import { getActiveOrganization } from '@/lib/server/active-org'
import { AppShellClient } from '@/components/layout/AppShellClient'
import { redirect } from 'next/navigation'
import { PermissionsProvider } from '@/contexts/PermissionsContext'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const {
    supabase,
    user,
    activeOrg,
    userOrganizations,
    isOwner,
    userPermissions,
  } = await getActiveOrganization()

  // Se o usuário não pertence a nenhum escritório, redireciona para o Onboarding
  if (!activeOrg) {
    redirect('/onboarding')
  }

  // Busca perfil na tabela dedicada user_profiles
  const { data: dbProfile } = await supabase
    .from('user_profiles')
    .select('full_name, display_name, avatar_url')
    .eq('user_id', user.id)
    .maybeSingle()

  // Dados do usuário
  const meta = user.user_metadata || {}
  const userDisplayName =
    dbProfile?.full_name ||
    dbProfile?.display_name ||
    meta.full_name ||
    meta.display_name ||
    user.email?.split('@')[0] ||
    'Usuário'
  const userAvatarUrl = dbProfile?.avatar_url || meta.avatar_url || null
  const userRole = activeOrg.profile_name || (isOwner ? 'Proprietário' : 'Membro')

  // Busca se há solicitações de atualização cadastral de clientes pendentes
  let pendingClientUpdatesCount = 0
  if (activeOrg.id) {
    const { count } = await supabase
      .from('client_update_requests')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', activeOrg.id)
      .eq('status', 'pending')
    pendingClientUpdatesCount = count || 0
  }

  return (
    <PermissionsProvider isOwner={isOwner} permissions={userPermissions}>
      <AppShellClient
        organizationId={activeOrg.id}
        officeName={activeOrg.name}
        orgLogoUrl={activeOrg.logo_url}
        userDisplayName={userDisplayName}
        userAvatarUrl={userAvatarUrl}
        userRole={userRole}
        isOwner={isOwner}
        userPermissions={userPermissions}
        pendingClientUpdatesCount={pendingClientUpdatesCount}
        userOrganizations={userOrganizations}
        activeOrgId={activeOrg.id}
      >
        {children}
      </AppShellClient>
    </PermissionsProvider>
  )
}
