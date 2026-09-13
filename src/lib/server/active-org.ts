import { cookies } from 'next/headers'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/server/guard'
import { FULL_PERMISSIONS, ProfilePermissions } from '@/types/profiles'
import { ACTIVE_ORG_COOKIE, UserOrganizationItem } from '@/types/organization'

export type { UserOrganizationItem }
export { ACTIVE_ORG_COOKIE }

/**
 * Busca todas as organizações às quais o usuário tem acesso (como proprietário ou membro)
 */
export async function getUserOrganizations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<UserOrganizationItem[]> {
  const orgMap = new Map<string, UserOrganizationItem>()

  // 1. Busca todas as associações de membros
  const { data: memberRows, error: memberErr } = await supabase
    .from('organization_members')
    .select('id, organization_id, role, profile_id, access_profiles(*), organizations(*)')
    .eq('user_id', userId)

  if (!memberErr && memberRows) {
    for (const row of memberRows) {
      const org = row.organizations as any
      if (!org || !org.id) continue

      const isOwner = org.owner_id === userId || row.role === 'owner'
      const prof = row.access_profiles as any

      const defaultRoleName =
        row.role === 'owner'
          ? 'Proprietário'
          : row.role === 'admin'
          ? 'Administrador'
          : row.role === 'intern'
          ? 'Estagiário'
          : 'Colaborador'

      const defaultRoleColor =
        row.role === 'owner'
          ? '#4F46E5'
          : row.role === 'admin'
          ? '#0284C7'
          : row.role === 'intern'
          ? '#F59E0B'
          : '#10B981'

      orgMap.set(org.id, {
        id: org.id,
        name: org.name || 'Meu Escritório',
        slug: org.slug || org.id,
        logo_url: org.logo_url || null,
        owner_id: org.owner_id,
        is_owner: isOwner,
        role: row.role || (isOwner ? 'owner' : 'collaborator'),
        profile_id: row.profile_id || null,
        profile_name: prof?.name || (isOwner ? 'Proprietário' : defaultRoleName),
        profile_color: prof?.color || (isOwner ? '#4F46E5' : defaultRoleColor),
      })
    }
  }

  // 2. Busca também organizações onde ele é owner_id (garantia caso ainda não esteja em organization_members)
  const { data: ownedOrgs, error: ownedErr } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', userId)

  if (!ownedErr && ownedOrgs) {
    for (const org of ownedOrgs) {
      if (!orgMap.has(org.id)) {
        orgMap.set(org.id, {
          id: org.id,
          name: org.name || 'Meu Escritório',
          slug: org.slug || org.id,
          logo_url: org.logo_url || null,
          owner_id: org.owner_id,
          is_owner: true,
          role: 'owner',
          profile_id: null,
          profile_name: 'Proprietário',
          profile_color: '#4F46E5',
        })
      }
    }
  }

  return Array.from(orgMap.values())
}

/**
 * Obtém a organização ativa para a sessão atual a partir do cookie orgarq_active_org_id
 */
export async function getActiveOrganization(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>
  user: {
    id: string
    email: string
    user_metadata?: Record<string, any>
  }
  activeOrg: UserOrganizationItem | null
  userOrganizations: UserOrganizationItem[]
  isOwner: boolean
  userPermissions: ProfilePermissions
}> {
  const { supabase, user } = await requireAuth()
  const userOrganizations = await getUserOrganizations(supabase, user.id)

  if (userOrganizations.length === 0) {
    return {
      supabase,
      user,
      activeOrg: null,
      userOrganizations: [],
      isOwner: false,
      userPermissions: {} as ProfilePermissions,
    }
  }

  const cookieStore = await cookies()
  const activeOrgCookie = cookieStore.get(ACTIVE_ORG_COOKIE)?.value

  let activeOrg = userOrganizations.find((o) => o.id === activeOrgCookie) || null

  // Se o cookie não existir ou for de um escritório ao qual o usuário não tem mais acesso,
  // define o primeiro escritório disponível (preferindo onde ele é owner)
  if (!activeOrg) {
    activeOrg = userOrganizations.find((o) => o.is_owner) || userOrganizations[0]
  }

  const isOwner = activeOrg.is_owner || activeOrg.owner_id === user.id

  // Carrega permissões do perfil ativo
  let permissions: ProfilePermissions = FULL_PERMISSIONS

  if (!isOwner && activeOrg.profile_id) {
    const { data: prof } = await supabase
      .from('access_profiles')
      .select('permissions, is_owner_profile')
      .eq('id', activeOrg.profile_id)
      .maybeSingle()

    if (prof && !prof.is_owner_profile) {
      permissions = (prof.permissions as ProfilePermissions) || {}
    }
  }

  return {
    supabase,
    user,
    activeOrg,
    userOrganizations,
    isOwner,
    userPermissions: permissions,
  }
}

