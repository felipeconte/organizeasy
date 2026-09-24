'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireAuth, requireOrgAccess, requirePermission } from '@/lib/server/guard'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { ACTIVE_ORG_COOKIE } from '@/lib/server/active-org'
import { sanitizeText } from '@/lib/server/sanitize'
import {
  AccessProfile,
  CreateProfileInput,
  UpdateProfileInput,
  FULL_PERMISSIONS,
  ProfilePermissions,
  OrganizationInvite,
} from '@/types/profiles'
import { generateUniqueOrganizationSlug } from '@/lib/actions/organization'

/**
 * Lista todos os perfis de acesso do escritório com contagem de membros vinculados
 */
export async function getAccessProfilesAction(organizationId: string): Promise<{
  success: boolean
  profiles?: AccessProfile[]
  error?: string
}> {
  try {
    const { supabase } = await requireOrgAccess(organizationId)

    // 1. Busca perfis
    const { data: profilesData, error: profilesError } = await supabase
      .from('access_profiles')
      .select('*')
      .eq('organization_id', organizationId)
      .order('is_owner_profile', { ascending: false })
      .order('created_at', { ascending: true })

    if (profilesError) {
      return { success: false, error: profilesError.message }
    }

    // 2. Busca contagem de membros por perfil
    const { data: membersData } = await supabase
      .from('organization_members')
      .select('profile_id')
      .eq('organization_id', organizationId)

    const memberCounts: Record<string, number> = {}
    if (membersData) {
      for (const m of membersData) {
        if (m.profile_id) {
          memberCounts[m.profile_id] = (memberCounts[m.profile_id] || 0) + 1
        }
      }
    }

    const profiles: AccessProfile[] = (profilesData || []).map((p) => ({
      id: p.id,
      organization_id: p.organization_id,
      name: p.name,
      description: p.description,
      color: p.color || '#2563EB',
      is_owner_profile: Boolean(p.is_owner_profile),
      is_system: Boolean(p.is_system),
      permissions: (p.permissions as ProfilePermissions) || {},
      created_at: p.created_at,
      updated_at: p.updated_at,
      members_count: memberCounts[p.id] || 0,
    }))

    return { success: true, profiles }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao buscar perfis de acesso.' }
  }
}

/**
 * Cria um novo perfil de acesso customizado no escritório
 */
export async function createAccessProfileAction(
  organizationId: string,
  data: CreateProfileInput
): Promise<{ success: boolean; profile?: AccessProfile; error?: string }> {
  try {
    const { supabase, user } = await requirePermission(organizationId, 'settings_profiles')

    const cleanName = sanitizeText(data.name)
    const cleanDesc = data.description ? sanitizeText(data.description) : null
    const color = data.color?.trim() || '#2563EB'

    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: 'O nome do perfil deve ter pelo menos 2 caracteres.' }
    }

    if (cleanName.toLowerCase() === 'proprietário' || cleanName.toLowerCase() === 'proprietario') {
      return { success: false, error: 'O nome "Proprietário" é exclusivo do perfil raiz do escritório.' }
    }

    const { data: inserted, error: insertError } = await supabase
      .from('access_profiles')
      .insert({
        organization_id: organizationId,
        name: cleanName,
        description: cleanDesc,
        color,
        is_owner_profile: false,
        is_system: false,
        permissions: data.permissions || {},
      })
      .select()
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return { success: false, error: 'Já existe um perfil com este nome neste escritório.' }
      }
      return { success: false, error: insertError.message }
    }

    revalidatePath('/app/configuracoes/perfis')
    revalidatePath('/app/configuracoes/escritorio')

    return {
      success: true,
      profile: {
        ...inserted,
        members_count: 0,
        permissions: inserted.permissions as ProfilePermissions,
      },
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao criar perfil de acesso.' }
  }
}

/**
 * Atualiza um perfil de acesso existente
 */
export async function updateAccessProfileAction(
  organizationId: string,
  profileId: string,
  data: UpdateProfileInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requirePermission(organizationId, 'settings_profiles')

    // Busca perfil atual para checar se é Proprietário
    const { data: currentProfile, error: fetchError } = await supabase
      .from('access_profiles')
      .select('*')
      .eq('id', profileId)
      .eq('organization_id', organizationId)
      .single()

    if (fetchError || !currentProfile) {
      return { success: false, error: 'Perfil de acesso não encontrado.' }
    }

    const cleanName = sanitizeText(data.name)
    const cleanDesc = data.description ? sanitizeText(data.description) : null
    const color = data.color?.trim() || currentProfile.color || '#2563EB'

    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: 'O nome do perfil deve ter pelo menos 2 caracteres.' }
    }

    // Se for o perfil Proprietário, nome e permissões são blindados (sempre 100%)
    if (currentProfile.is_owner_profile) {
      const { error: updateError } = await supabase
        .from('access_profiles')
        .update({
          description: cleanDesc,
          color,
          permissions: FULL_PERMISSIONS,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profileId)
        .eq('organization_id', organizationId)

      if (updateError) return { success: false, error: updateError.message }

      revalidatePath('/app/configuracoes/perfis')
      revalidatePath('/app/configuracoes/escritorio')
      return { success: true }
    }

    // Perfil normal: atualiza nome, descrição, cor e permissões
    const { error: updateError } = await supabase
      .from('access_profiles')
      .update({
        name: cleanName,
        description: cleanDesc,
        color,
        permissions: data.permissions || {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId)
      .eq('organization_id', organizationId)

    if (updateError) {
      if (updateError.code === '23505') {
        return { success: false, error: 'Já existe outro perfil com este nome neste escritório.' }
      }
      return { success: false, error: updateError.message }
    }

    revalidatePath('/app/configuracoes/perfis')
    revalidatePath('/app/configuracoes/escritorio')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao atualizar perfil de acesso.' }
  }
}

/**
 * Exclui um perfil de acesso (se não for Proprietário e não tiver membros ativos)
 */
export async function deleteAccessProfileAction(
  organizationId: string,
  profileId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requirePermission(organizationId, 'settings_profiles')

    // 1. Verifica se é Proprietário
    const { data: currentProfile } = await supabase
      .from('access_profiles')
      .select('name, is_owner_profile')
      .eq('id', profileId)
      .eq('organization_id', organizationId)
      .single()

    if (!currentProfile) {
      return { success: false, error: 'Perfil não encontrado.' }
    }

    if (currentProfile.is_owner_profile) {
      return { success: false, error: 'O perfil "Proprietário" é vitalício e não pode ser excluído.' }
    }

    // 2. Verifica se há membros vinculados
    const { count } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('profile_id', profileId)

    if (count && count > 0) {
      return {
        success: false,
        error: `Não é possível excluir este perfil porque existem ${count} membro(s) vinculados a ele. Altere o perfil desses membros antes de excluir.`,
      }
    }

    // 3. Exclui o perfil
    const { error: deleteError } = await supabase
      .from('access_profiles')
      .delete()
      .eq('id', profileId)
      .eq('organization_id', organizationId)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    revalidatePath('/app/configuracoes/perfis')
    revalidatePath('/app/configuracoes/escritorio')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao excluir perfil de acesso.' }
  }
}

/**
 * Transfere a propriedade do escritório para outro membro (Ação Irrevogável)
 */
export async function transferOfficeOwnershipAction(
  organizationId: string,
  input: {
    targetUserId: string
    afterAction: 'change_profile' | 'leave_office'
    newProfileId?: string
  }
): Promise<{
  success: boolean
  leftOffice?: boolean
  nextOrgId?: string | null
  nextOrgName?: string | null
  redirectUrl?: string
  error?: string
}> {
  try {
    const { supabase, user } = await requireAuth()

    // 1. Valida se o usuário atual é realmente o Proprietário (owner_id) da organização
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, owner_id')
      .eq('id', organizationId)
      .single()

    if (orgError || !orgData) {
      return { success: false, error: 'Organização não encontrada.' }
    }

    if (orgData.owner_id !== user.id) {
      return { success: false, error: 'Apenas o proprietário atual pode transferir a posse do escritório.' }
    }

    if (input.targetUserId === user.id) {
      return { success: false, error: 'Selecione outro membro para receber a propriedade.' }
    }

    // 2. Valida se o membro de destino pertence ao escritório
    const { data: targetMember, error: targetError } = await supabase
      .from('organization_members')
      .select('id, user_id, organization_id')
      .eq('organization_id', organizationId)
      .eq('user_id', input.targetUserId)
      .single()

    if (targetError || !targetMember) {
      return { success: false, error: 'O membro de destino não foi encontrado no escritório.' }
    }

    // 3. Localiza o perfil de Proprietário do escritório
    const { data: ownerProfile, error: profileError } = await supabase
      .from('access_profiles')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_owner_profile', true)
      .single()

    if (profileError || !ownerProfile) {
      return { success: false, error: 'Perfil de proprietário não encontrado no escritório.' }
    }

    // Usamos o Admin client ou client autenticado com transação para segurança total
    const admin = createAdminClient()

    // 4. Atualiza a organização para ter o novo owner_id
    const { error: updateOrgError } = await admin
      .from('organizations')
      .update({ owner_id: input.targetUserId, updated_at: new Date().toISOString() })
      .eq('id', organizationId)

    if (updateOrgError) {
      return { success: false, error: `Erro ao transferir organização: ${updateOrgError.message}` }
    }

    // 5. Atribui o novo proprietário ao perfil de Proprietário
    await admin
      .from('organization_members')
      .update({
        role: 'owner',
        profile_id: ownerProfile.id,
      })
      .eq('organization_id', organizationId)
      .eq('user_id', input.targetUserId)

    // 6. Trata o destino do antigo proprietário
    if (input.afterAction === 'leave_office') {
      // Remove completamente da organização
      await admin
        .from('organization_members')
        .delete()
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)

      // Busca outros escritórios onde o usuário tenha vínculo (excluindo o atual do qual acabou de sair)
      // 1. Vínculos de membro ativo
      const { data: otherMemberships } = await admin
        .from('organization_members')
        .select('organization_id, role, created_at, organizations(id, name, owner_id, created_at)')
        .eq('user_id', user.id)
        .neq('organization_id', organizationId)

      // 2. Escritórios onde ele é o dono (owner_id)
      const { data: ownedOrgs } = await admin
        .from('organizations')
        .select('id, name, owner_id, created_at')
        .eq('owner_id', user.id)
        .neq('id', organizationId)

      interface CandidateOffice {
        id: string
        name: string
        is_owner: boolean
        membershipTimestamp: number
      }

      const candidateMap = new Map<string, CandidateOffice>()

      if (otherMemberships) {
        for (const m of otherMemberships) {
          const org = m.organizations as any
          if (!org || !org.id) continue

          const isOwner = org.owner_id === user.id || m.role === 'owner'
          const memberTime = m.created_at ? new Date(m.created_at).getTime() : Date.now()

          candidateMap.set(org.id, {
            id: org.id,
            name: org.name || 'Escritório',
            is_owner: isOwner,
            membershipTimestamp: memberTime,
          })
        }
      }

      if (ownedOrgs) {
        for (const org of ownedOrgs) {
          const orgTime = org.created_at ? new Date(org.created_at).getTime() : Date.now()
          if (!candidateMap.has(org.id)) {
            candidateMap.set(org.id, {
              id: org.id,
              name: org.name || 'Escritório',
              is_owner: true,
              membershipTimestamp: orgTime,
            })
          } else {
            const existing = candidateMap.get(org.id)!
            existing.is_owner = true
          }
        }
      }

      const candidateList = Array.from(candidateMap.values())
      const cookieStore = await cookies()

      if (candidateList.length > 0) {
        // Ordenação prioritária:
        // 1. Escritório onde é proprietário (is_owner === true)
        // 2. Caso haja múltiplos (ou nenhum) proprietário: preferência ao que for membro há mais tempo (menor timestamp)
        candidateList.sort((a, b) => {
          if (a.is_owner && !b.is_owner) return -1
          if (!a.is_owner && b.is_owner) return 1
          return a.membershipTimestamp - b.membershipTimestamp
        })

        const nextOffice = candidateList[0]

        cookieStore.set(ACTIVE_ORG_COOKIE, nextOffice.id, {
          path: '/',
          maxAge: 60 * 60 * 24 * 365,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
        })

        revalidatePath('/app', 'layout')

        return {
          success: true,
          leftOffice: true,
          nextOrgId: nextOffice.id,
          nextOrgName: nextOffice.name,
          redirectUrl: '/app',
        }
      } else {
        // Se não tiver nenhum outro escritório, limpa o cookie e redireciona para onboarding
        cookieStore.delete(ACTIVE_ORG_COOKIE)

        revalidatePath('/app', 'layout')
        revalidatePath('/onboarding')

        return {
          success: true,
          leftOffice: true,
          nextOrgId: null,
          redirectUrl: '/onboarding',
        }
      }
    } else {
      // Muda para outro perfil escolhido
      if (!input.newProfileId) {
        return { success: false, error: 'Selecione um novo perfil para a sua conta.' }
      }

      // Valida se o novo perfil não é o próprio perfil de proprietário
      if (input.newProfileId === ownerProfile.id) {
        return { success: false, error: 'Você deve selecionar um perfil diferente de Proprietário.' }
      }

      await admin
        .from('organization_members')
        .update({
          role: 'admin',
          profile_id: input.newProfileId,
        })
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)

      revalidatePath('/app', 'layout')
      return { success: true, leftOffice: false }
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao transferir propriedade do escritório.' }
  }
}

/**
 * Cria um novo escritório durante o Onboarding, associando perfis padrões e templates
 */
export async function createOfficeWithDefaultProfilesAction(officeName: string): Promise<{
  success: boolean
  organizationId?: string
  error?: string
}> {
  try {
    const { supabase, user } = await requireAuth()

    const cleanName = sanitizeText(officeName)
    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: 'O nome do escritório deve ter no mínimo 2 caracteres.' }
    }

    const slug = await generateUniqueOrganizationSlug(supabase, cleanName)

    // Cria a organização
    // Os triggers do banco (trigger_new_organization_profiles e trigger_create_organization_defaults)
    // irão automaticamente criar os 4 perfis padrões, associar o usuário como Proprietário e gerar as etapas!
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: cleanName,
        slug,
        owner_id: user.id,
        email: user.email,
      })
      .select('id')
      .single()

    if (orgError || !orgData) {
      return { success: false, error: orgError?.message || 'Falha ao criar o escritório.' }
    }

    revalidatePath('/app', 'layout')
    return { success: true, organizationId: orgData.id }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao criar o novo escritório.' }
  }
}

/**
 * Busca convites pendentes de participação em escritórios para o e-mail do usuário logado
 */
export async function getPendingInvitesForUserAction(): Promise<{
  success: boolean
  invites?: OrganizationInvite[]
  error?: string
}> {
  try {
    const { supabase, user } = await requireAuth()
    const email = user.email?.toLowerCase().trim()

    if (!email) {
      return { success: true, invites: [] }
    }

    const { data, error } = await supabase
      .from('organization_invites')
      .select('*, access_profiles(id, name, color), organizations(id, name, logo_url)')
      .eq('email', email)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    const invites: OrganizationInvite[] = (data || []).map((inv: any) => ({
      id: inv.id,
      organization_id: inv.organization_id,
      email: inv.email,
      profile_id: inv.profile_id,
      invite_code: inv.invite_code,
      invited_by: inv.invited_by,
      status: inv.status,
      created_at: inv.created_at,
      expires_at: inv.expires_at,
      profile: inv.access_profiles || null,
      organization: inv.organizations || null,
    }))

    return { success: true, invites }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao buscar convites.' }
  }
}

/**
 * Obtém detalhes públicos/seguros de um convite para a página de aceite (/convite/[id])
 */
export async function getInviteDetailsAction(inviteId: string): Promise<{
  success: boolean
  invite?: {
    id: string
    email: string
    organization_id: string
    organization_name: string
    organization_logo: string | null
    profile_id: string | null
    profile_name: string
    profile_color: string
    profile_description: string | null
    inviter_name: string | null
    status: string
    expires_at: string | null
  }
  error?: string
}> {
  try {
    const adminClient = createAdminClient()

    const { data: invite, error: fetchErr } = await adminClient
      .from('organization_invites')
      .select('*, access_profiles(*), organizations(*)')
      .eq('id', inviteId)
      .single()

    if (fetchErr || !invite) {
      return { success: false, error: 'Convite não encontrado ou link inválido.' }
    }

    const org = invite.organizations as any
    const prof = invite.access_profiles as any

    let inviterName: string | null = null
    if (invite.invited_by) {
      try {
        const { data: inviterUser } = await adminClient.auth.admin.getUserById(invite.invited_by)
        inviterName =
          inviterUser?.user?.user_metadata?.full_name ||
          inviterUser?.user?.user_metadata?.display_name ||
          inviterUser?.user?.email?.split('@')[0] ||
          null
      } catch {
        // Ignora
      }
    }

    return {
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        organization_id: invite.organization_id,
        organization_name: org?.name || 'Meu Escritório',
        organization_logo: org?.logo_url || null,
        profile_id: invite.profile_id,
        profile_name: prof?.name || 'Colaborador',
        profile_color: prof?.color || '#2563EB',
        profile_description: prof?.description || null,
        inviter_name: inviterName,
        status: invite.status,
        expires_at: invite.expires_at,
      },
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao carregar dados do convite.' }
  }
}

/**
 * Aceita um convite de participação em um escritório para o usuário logado
 */
export async function acceptOfficeInviteAction(inviteId: string): Promise<{
  success: boolean
  organizationId?: string
  error?: string
}> {
  try {
    const { user } = await requireAuth()
    const admin = createAdminClient()

    const { data: invite, error: inviteErr } = await admin
      .from('organization_invites')
      .select('*')
      .eq('id', inviteId)
      .eq('status', 'pending')
      .single()

    if (inviteErr || !invite) {
      return { success: false, error: 'Convite inválido, já utilizado ou expirado.' }
    }

    // Insere o membro na organização com o perfil definido
    const { error: insertErr } = await admin.from('organization_members').upsert(
      {
        organization_id: invite.organization_id,
        user_id: user.id,
        role: 'collaborator',
        profile_id: invite.profile_id,
      },
      { onConflict: 'organization_id,user_id' }
    )

    if (insertErr) {
      return { success: false, error: insertErr.message }
    }

    // Marca o convite como aceito
    await admin
      .from('organization_invites')
      .update({ status: 'accepted' })
      .eq('id', inviteId)

    // Define este escritório como o ativo no cookie
    const cookieStore = await cookies()
    cookieStore.set(ACTIVE_ORG_COOKIE, invite.organization_id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    revalidatePath('/app', 'layout')
    return { success: true, organizationId: invite.organization_id }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao aceitar convite.' }
  }
}

/**
 * Registra uma nova conta a partir do convite personalizado e já vincula ao escritório
 */
export async function registerAndAcceptInviteAction(input: {
  inviteId: string
  fullName: string
  password: string
}): Promise<{
  success: boolean
  email?: string
  organizationId?: string
  error?: string
  code?: string
}> {
  try {
    const cleanName = sanitizeText(input.fullName)
    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: 'Por favor, informe seu nome completo.' }
    }

    if (!input.password || input.password.length < 6) {
      return { success: false, error: 'A senha deve conter no mínimo 6 caracteres.' }
    }

    const admin = createAdminClient()

    // 1. Busca o convite pendente
    const { data: invite, error: inviteErr } = await admin
      .from('organization_invites')
      .select('*')
      .eq('id', input.inviteId)
      .eq('status', 'pending')
      .single()

    if (inviteErr || !invite) {
      return { success: false, error: 'Este convite não é mais válido ou já foi utilizado.' }
    }

    // 2. Cria o usuário com confirmação de e-mail automática via Admin
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: invite.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: cleanName,
        display_name: cleanName,
      },
    })

    if (authError || !authUser.user) {
      const msg = authError?.message || 'Erro ao criar conta.'
      if (msg.includes('already registered') || msg.includes('unique constraint') || msg.includes('exists')) {
        return {
          success: false,
          error: 'Este endereço de e-mail já possui uma conta no Organizeasy. Por favor, faça login para aceitar o convite.',
          code: 'USER_EXISTS',
        }
      }
      return { success: false, error: msg }
    }

    const newUserId = authUser.user.id

    // 3. Cria o perfil do usuário em user_profiles
    try {
      await admin.from('user_profiles').upsert(
        {
          user_id: newUserId,
          full_name: cleanName,
          display_name: cleanName,
        },
        { onConflict: 'user_id' }
      )
    } catch {
      // Ignora se tabela não for estrita
    }

    // 4. Insere o membro na organização vinculando ao profile_id do convite
    const { error: memberErr } = await admin.from('organization_members').upsert(
      {
        organization_id: invite.organization_id,
        user_id: newUserId,
        role: 'collaborator',
        profile_id: invite.profile_id,
      },
      { onConflict: 'organization_id,user_id' }
    )

    if (memberErr) {
      return { success: false, error: `Erro ao vincular ao escritório: ${memberErr.message}` }
    }

    // 5. Marca o convite como aceito
    await admin
      .from('organization_invites')
      .update({ status: 'accepted' })
      .eq('id', input.inviteId)

    // 6. Define o escritório ativo no cookie
    const cookieStore = await cookies()
    cookieStore.set(ACTIVE_ORG_COOKIE, invite.organization_id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    return {
      success: true,
      email: invite.email,
      organizationId: invite.organization_id,
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao concluir cadastro e convite.' }
  }
}

/**
 * Ingressa em um escritório usando o Código de Convite (ex: ORG-12345)
 */
export async function joinOfficeByCodeAction(inviteCode: string): Promise<{
  success: boolean
  organizationId?: string
  error?: string
}> {
  try {
    const { supabase, user } = await requireAuth()

    const cleanCode = inviteCode.trim().toUpperCase()
    if (!cleanCode) {
      return { success: false, error: 'Digite o código de convite do escritório.' }
    }

    const { data: invite, error: inviteErr } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('invite_code', cleanCode)
      .eq('status', 'pending')
      .single()

    if (inviteErr || !invite) {
      return { success: false, error: 'Código de convite não encontrado, já utilizado ou expirado.' }
    }

    const admin = createAdminClient()
    const { error: insertErr } = await admin.from('organization_members').upsert(
      {
        organization_id: invite.organization_id,
        user_id: user.id,
        role: 'collaborator',
        profile_id: invite.profile_id,
      },
      { onConflict: 'organization_id,user_id' }
    )

    if (insertErr) {
      return { success: false, error: insertErr.message }
    }

    await admin
      .from('organization_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id)

    revalidatePath('/app', 'layout')
    return { success: true, organizationId: invite.organization_id }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao ingressar pelo código.' }
  }
}

/**
 * Cria um convite para membro com código e e-mail
 */
export async function createOfficeInviteAction(
  organizationId: string,
  email: string,
  profileId?: string
): Promise<{ success: boolean; inviteCode?: string; error?: string }> {
  try {
    const { supabase, user } = await requireOrgAccess(organizationId)

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'E-mail inválido.' }
    }

    // Gera código único amigável (ex: ORG-8492)
    const code = 'ORG-' + Math.floor(10000 + Math.random() * 90000)

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('organization_invites')
      .insert({
        organization_id: organizationId,
        email: cleanEmail,
        profile_id: profileId || null,
        invite_code: code,
        invited_by: user.id,
        status: 'pending',
      })
      .select('invite_code')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, inviteCode: data.invite_code }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao gerar convite.' }
  }
}
