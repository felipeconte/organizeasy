import { requireAuth, hasPermission } from '@/lib/server/guard'
import { getActiveOrganization } from '@/lib/server/active-org'
import { redirect } from 'next/navigation'
import AccessDenied from '@/components/ui/AccessDenied'
import OfficeSettingsClient, {
  OrganizationData,
  MemberData,
  PendingInviteData,
} from '@/components/organization/OfficeSettingsClient'

export default async function OfficeProfilePage() {
  const { supabase, user, activeOrg, isOwner, userPermissions } = await getActiveOrganization()

  if (!activeOrg) {
    redirect('/onboarding')
  }

  // Proteção de rota: Requer permissão para editar dados do escritório ou gerenciar equipe
  if (!hasPermission(isOwner, userPermissions, ['settings_office', 'settings_team'])) {
    return (
      <AccessDenied
        moduleName="Dados do Escritório & Equipe"
        userProfileName={activeOrg.profile_name}
        userProfileColor={activeOrg.profile_color}
      />
    )
  }

  // 1. Busca os dados cadastrais da organização ativa
  const { data: orgData } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', activeOrg.id)
    .single()

  const org: OrganizationData = (orgData as unknown as OrganizationData) || {
    id: activeOrg.id,
    name: activeOrg.name,
    slug: activeOrg.slug,
    professional_council_id: (orgData as any)?.professional_council_id || (orgData as any)?.cau_caubr || null,
    cau_caubr: (orgData as any)?.cau_caubr || (orgData as any)?.professional_council_id || null,
    cnpj: null,
    phone: null,
    email: user.email || null,
    logo_url: activeOrg.logo_url,
    owner_id: activeOrg.owner_id,
  }

  // 2. Busca todos os perfis de acesso do escritório
  let profiles: any[] = []
  const { data: profilesData } = await supabase
    .from('access_profiles')
    .select('*')
    .eq('organization_id', org.id)
    .order('is_owner_profile', { ascending: false })
    .order('created_at', { ascending: true })

  if (profilesData) {
    profiles = profilesData
  }

  // 3. Busca todos os membros ativos da organização
  let members: MemberData[] = []
  const { data: mems } = await supabase
    .from('organization_members')
    .select('*, access_profiles(*)')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: true })

  if (mems && mems.length > 0) {
    let emailMap: Record<string, { email: string; fullName: string }> = {}
    try {
      const { data: rpcMembers } = await (supabase.rpc as any)('get_organization_members_with_email', {
        target_org_id: org.id,
      })
      if (rpcMembers && Array.isArray(rpcMembers)) {
        for (const rm of rpcMembers) {
          emailMap[rm.user_id] = {
            email: rm.email,
            fullName: rm.full_name,
          }
        }
      }
    } catch {
      // Fallback
    }

    members = mems.map((m: any) => ({
      id: m.id,
      organization_id: m.organization_id,
      user_id: m.user_id,
      role: m.role,
      profile_id: m.profile_id,
      profile_name: m.access_profiles?.name,
      profile_color: m.access_profiles?.color,
      created_at: m.created_at,
      email: emailMap[m.user_id]?.email || (m.user_id === user.id ? user.email : undefined),
      fullName:
        emailMap[m.user_id]?.fullName ||
        (m.user_id === user.id ? (user.user_metadata?.full_name || user.email?.split('@')[0]) : undefined),
    })) as MemberData[]
  }

  // Se a lista de membros estiver vazia, inclui o proprietário
  if (members.length === 0) {
    const ownerProf = profiles.find((p) => p.is_owner_profile)
    members = [
      {
        id: `owner-${user.id}`,
        organization_id: org.id,
        user_id: user.id,
        role: 'owner',
        profile_id: ownerProf?.id || null,
        profile_name: 'Proprietário',
        profile_color: '#4F46E5',
        created_at: new Date().toISOString(),
        email: user.email,
        fullName: user.user_metadata?.full_name || user.email?.split('@')[0],
      },
    ]
  }

  // 4. Busca todos os convites pendentes do escritório
  let pendingInvites: PendingInviteData[] = []
  const { data: invitesData } = await supabase
    .from('organization_invites')
    .select('id, organization_id, email, profile_id, invite_code, status, created_at, access_profiles(id, name, color)')
    .eq('organization_id', org.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (invitesData) {
    pendingInvites = invitesData.map((inv: any) => ({
      id: inv.id,
      organization_id: inv.organization_id,
      email: inv.email,
      profile_id: inv.profile_id,
      profile_name: inv.access_profiles?.name || 'Colaborador',
      profile_color: inv.access_profiles?.color || '#2563EB',
      invite_code: inv.invite_code,
      created_at: inv.created_at,
      status: inv.status,
    }))
  }

  return (
    <OfficeSettingsClient
      organization={org}
      members={members}
      pendingInvites={pendingInvites}
      profiles={profiles}
      currentUserId={user.id}
      currentUserEmail={user.email || 'Usuário'}
      isOwner={isOwner}
      userPermissions={userPermissions}
    />
  )
}
