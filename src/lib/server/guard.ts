/**
 * ==============================================================================
 * ORGARQ - Server Security Guard & IDOR Prevention
 * ==============================================================================
 * Garante que regras de negócio, autenticação e validações de tenant/ownership
 * sejam executadas exclusivamente no servidor antes de qualquer consulta ou mutação.
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Database } from '@/types/database.types'

type MemberRow = Database['public']['Tables']['organization_members']['Row']
type ProjectRow = Database['public']['Tables']['projects']['Row']

export interface AuthenticatedUser {
  id: string
  email: string
  user_metadata?: Record<string, any>
}

/**
 * 1. Exige autenticação válida do usuário no servidor.
 */
export async function requireAuth(): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; user: AuthenticatedUser }> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user || !user.id) {
    redirect('/login')
  }

  return {
    supabase,
    user: {
      id: user.id,
      email: user.email || '',
      user_metadata: user.user_metadata || {},
    },
  }
}


import { PermissionKey, ProfilePermissions, FULL_PERMISSIONS } from '@/types/profiles'

/**
 * 2. Prevenção de IDOR: Valida se o usuário autenticado é membro ativo ou proprietário da organização
 * e carrega seu perfil de acesso e permissões granulares.
 */
export async function requireOrgAccess(organizationId: string) {
  const { supabase, user } = await requireAuth()

  // 1. Verifica se a organização existe e se o usuário é o proprietário raiz
  const { data: orgData } = await supabase
    .from('organizations')
    .select('id, owner_id')
    .eq('id', organizationId)
    .maybeSingle()

  const isOwner = orgData?.owner_id === user.id

  // 2. Busca dados de membro e perfil
  const { data: memberData } = await supabase
    .from('organization_members')
    .select('*, access_profiles(*)')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (memberData) {
    const profile = (memberData as any).access_profiles
    const permissions: ProfilePermissions = isOwner || profile?.is_owner_profile
      ? FULL_PERMISSIONS
      : ((profile?.permissions as ProfilePermissions) || {})

    return {
      supabase,
      user,
      memberRole: memberData.role,
      profileId: memberData.profile_id,
      profileName: profile?.name || (isOwner ? 'Proprietário' : 'Membro'),
      isOwner,
      permissions,
    }
  }

  if (isOwner) {
    // Busca o perfil de proprietário do escritório
    const { data: ownerProf } = await supabase
      .from('access_profiles')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_owner_profile', true)
      .maybeSingle()

    // Auto-associa como owner na tabela de membros para manter consistência
    await supabase.from('organization_members').upsert(
      {
        organization_id: organizationId,
        user_id: user.id,
        role: 'owner',
        profile_id: ownerProf?.id || null,
      },
      { onConflict: 'organization_id,user_id' }
    )

    return {
      supabase,
      user,
      memberRole: 'owner' as const,
      profileId: ownerProf?.id || null,
      profileName: 'Proprietário',
      isOwner: true,
      permissions: FULL_PERMISSIONS,
    }
  }

  throw new Error('Acesso negado: Você não possui permissão para acessar esta organização (IDOR Blocked).')
}

export { hasPermission } from '@/types/profiles'

/**
 * 2.1. Valida se o usuário autenticado possui uma permissão específica no escritório.
 */
export async function requirePermission(
  organizationId: string,
  permissionKey: PermissionKey | PermissionKey[]
) {
  const orgAccess = await requireOrgAccess(organizationId)

  if (orgAccess.isOwner) {
    return orgAccess
  }

  const allowed = Array.isArray(permissionKey)
    ? permissionKey.some((key) => orgAccess.permissions[key] === true)
    : orgAccess.permissions[permissionKey] === true

  if (!allowed) {
    const keysStr = Array.isArray(permissionKey) ? permissionKey.join(' ou ') : permissionKey
    throw new Error(`Acesso negado: Seu perfil não possui permissão para a funcionalidade "${keysStr}".`)
  }

  return orgAccess
}

/**
 * 3. Prevenção de IDOR: Valida se o projeto pertence a uma organização do usuário autenticado ou foi criado por ele.
 */
export async function requireProjectAccess(projectId: string) {
  const { supabase, user } = await requireAuth()

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle()

  const project = data as ProjectRow | null

  if (error || !project) {
    throw new Error('Acesso negado: Projeto não encontrado (IDOR Blocked).')
  }

  // Valida que o usuário é membro ou proprietário da organização proprietária do projeto
  const orgAccess = await requireOrgAccess(project.organization_id)

  return {
    supabase,
    user,
    project,
    memberRole: orgAccess.memberRole,
    isOwner: orgAccess.isOwner,
    permissions: orgAccess.permissions,
  }
}
