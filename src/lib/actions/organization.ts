'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { requireAuth, requireOrgAccess, requirePermission } from '@/lib/server/guard'
import { sanitizeText } from '@/lib/server/sanitize'
import { Database } from '@/types/database.types'
import { cleanDigits, maskCPFOrCNPJ, validateCPF, validateCNPJ } from '@/lib/formatters-and-validators'
import { createAdminClient } from '@/lib/supabase/server'
import { sendUserInvitationEmail } from '@/lib/server/email'
import { ACTIVE_ORG_COOKIE } from '@/types/organization'


type OrganizationUpdate = Database['public']['Tables']['organizations']['Update']

/**
 * Atualiza os dados cadastrais do escritório / organização
 */
export async function updateOrganizationAction(
  orgId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user } = await requireAuth()

  // Validação de acesso
  await requirePermission(orgId, 'settings_office')

  const name = sanitizeText(formData.get('name') as string)
  const slug = sanitizeText(formData.get('slug') as string)
    ?.toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
  const professional_council_id = sanitizeText(
    (formData.get('professional_council_id') || formData.get('cau_caubr')) as string
  )
  const cnpj = sanitizeText(formData.get('cnpj') as string)
  const phone = sanitizeText(formData.get('phone') as string)
  const email = sanitizeText(formData.get('email') as string)
  const logo_url = sanitizeText(formData.get('logo_url') as string)

  if (!name) {
    return { success: false, error: 'O nome do escritório é obrigatório.' }
  }

  if (!slug) {
    return { success: false, error: 'O identificador (slug) é obrigatório.' }
  }

  if (cnpj) {
    const digits = cleanDigits(cnpj)
    if (digits.length === 11) {
      if (!validateCPF(digits)) {
        return { success: false, error: 'O CPF informado é inválido. Verifique os dígitos.' }
      }
    } else if (digits.length === 14) {
      if (!validateCNPJ(digits)) {
        return { success: false, error: 'O CNPJ informado é inválido. Verifique os dígitos.' }
      }
    } else {
      return { success: false, error: 'O documento deve ser um CPF válido (11 dígitos) ou CNPJ válido (14 dígitos).' }
    }
  }

  // Verifica se o slug já está em uso por outro escritório
  const { data: existingSlug } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .neq('id', orgId)
    .maybeSingle()

  if (existingSlug) {
    return { success: false, error: 'Este identificador (slug) já está em uso por outro escritório. Escolha outro.' }
  }

  const updatePayload: Record<string, any> = {
    name,
    slug,
    professional_council_id: professional_council_id || null,
    cau_caubr: professional_council_id || null,
    cnpj: cnpj ? maskCPFOrCNPJ(cnpj) : null,
    phone: phone || null,
    email: email || null,
    logo_url: logo_url || null,
  }

  let { error } = await supabase
    .from('organizations')
    .update(updatePayload as any)
    .eq('id', orgId)

  // Fallback se a coluna professional_council_id ainda não existir no schema remoto
  if (error && (error.message?.includes('professional_council_id') || error.code === '42703')) {
    delete updatePayload.professional_council_id
    const retry = await supabase.from('organizations').update(updatePayload as any).eq('id', orgId)
    error = retry.error
  }

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/app/configuracoes/escritorio')
  revalidatePath('/app')
  return { success: true }
}

/**
 * Adiciona um novo membro à equipe exclusivamente através de convite personalizado por e-mail
 */
export async function addOrganizationMemberAction(
  orgId: string,
  data: {
    email: string
    role?: 'owner' | 'admin' | 'collaborator' | 'intern'
    profileId?: string
  }
): Promise<{
  success: boolean
  message?: string
  invite?: {
    id: string
    email: string
    profile_id: string | null
    status: string
    created_at: string
    invite_code: string
  }
  error?: string
}> {
  try {
    const { supabase, user } = await requireAuth()
    await requirePermission(orgId, 'settings_team')

    const cleanEmail = sanitizeText(data.email).toLowerCase().trim()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Por favor, informe um endereço de e-mail válido.' }
    }

    const adminClient = createAdminClient()

    // 1. Verifica se já existe um membro ativo com este e-mail nesta organização
    // Primeiro via RPC get_user_id_by_email se existir
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingUserId } = await (adminClient.rpc as any)('get_user_id_by_email', {
        lookup_email: cleanEmail,
      })

      if (existingUserId) {
        const { data: existingMember } = await adminClient
          .from('organization_members')
          .select('id')
          .eq('organization_id', orgId)
          .eq('user_id', existingUserId)
          .maybeSingle()

        if (existingMember) {
          return {
            success: false,
            error: `O usuário com o e-mail "${cleanEmail}" já faz parte da equipe deste escritório.`,
          }
        }
      }
    } catch {
      // Segue para criação do convite
    }

    // 2. Verifica se já existe um convite pendente para este e-mail nesta organização
    const { data: existingInvite } = await adminClient
      .from('organization_invites')
      .select('id, invite_code, status')
      .eq('organization_id', orgId)
      .eq('email', cleanEmail)
      .eq('status', 'pending')
      .maybeSingle()

    let inviteId = existingInvite?.id
    let inviteCode = existingInvite?.invite_code

    if (existingInvite) {
      // Atualiza o perfil caso tenha sido alterado
      await adminClient
        .from('organization_invites')
        .update({
          profile_id: data.profileId || null,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', existingInvite.id)
    } else {
      // 3. Cria novo registro de convite pendente
      inviteCode = 'ORG-' + Math.floor(10000 + Math.random() * 90000)
      const { data: newInvite, error: insertError } = await adminClient
        .from('organization_invites')
        .insert({
          organization_id: orgId,
          email: cleanEmail,
          profile_id: data.profileId || null,
          invite_code: inviteCode,
          invited_by: user.id,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select('id, invite_code, created_at')
        .single()

      if (insertError || !newInvite) {
        return { success: false, error: insertError?.message || 'Falha ao registrar convite.' }
      }

      inviteId = newInvite.id
      inviteCode = newInvite.invite_code
    }

    // 4. Monta link personalizado e dispara e-mail via Resend
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000'
    const personalizedInviteLink = `${baseUrl}/convite/${inviteId}`

    const { data: orgData } = await adminClient
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()

    const inviterName =
      user.user_metadata?.full_name ||
      user.user_metadata?.display_name ||
      user.email?.split('@')[0] ||
      null

    let emailSent = false
    try {
      const emailRes = await sendUserInvitationEmail({
        userEmail: cleanEmail,
        inviterName,
        officeName: orgData?.name || 'Nosso Escritório',
        inviteLink: personalizedInviteLink,
      })
      emailSent = emailRes.success
    } catch (mailErr) {
      console.warn('Aviso: Falha no envio do e-mail do convite via Resend:', mailErr)
    }

    revalidatePath('/app/configuracoes/escritorio')

    return {
      success: true,
      message: emailSent
        ? `Convite enviado por e-mail para "${cleanEmail}"! O colaborador receberá o link para ingressar na equipe.`
        : `Convite criado para "${cleanEmail}"! Link de acesso disponível para cópia.`,
      invite: {
        id: inviteId!,
        email: cleanEmail,
        profile_id: data.profileId || null,
        status: 'pending',
        created_at: new Date().toISOString(),
        invite_code: inviteCode!,
      },
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || `Não foi possível gerar o convite para "${data.email}".`,
    }
  }
}

/**
 * Reenvia o e-mail de convite para um membro pendente
 */
export async function resendOfficeInviteAction(
  orgId: string,
  inviteId: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const { user } = await requireAuth()
    await requirePermission(orgId, 'settings_team')

    const adminClient = createAdminClient()
    const { data: invite, error: fetchErr } = await adminClient
      .from('organization_invites')
      .select('id, email, organization_id, status')
      .eq('id', inviteId)
      .eq('organization_id', orgId)
      .single()

    if (fetchErr || !invite) {
      return { success: false, error: 'Convite não encontrado.' }
    }

    if (invite.status !== 'pending') {
      return { success: false, error: 'Este convite não está mais pendente.' }
    }

    const { data: orgData } = await adminClient
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000'
    const personalizedInviteLink = `${baseUrl}/convite/${invite.id}`

    const inviterName =
      user.user_metadata?.full_name ||
      user.user_metadata?.display_name ||
      user.email?.split('@')[0] ||
      null

    await sendUserInvitationEmail({
      userEmail: invite.email,
      inviterName,
      officeName: orgData?.name || 'Nosso Escritório',
      inviteLink: personalizedInviteLink,
    })

    return {
      success: true,
      message: `Convite reenviado com sucesso para "${invite.email}"!`,
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao reenviar convite.' }
  }
}

/**
 * Cancela/exclui um convite pendente
 */
export async function cancelOfficeInviteAction(
  orgId: string,
  inviteId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAuth()
    await requirePermission(orgId, 'settings_team')

    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('organization_invites')
      .delete()
      .eq('id', inviteId)
      .eq('organization_id', orgId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/app/configuracoes/escritorio')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao cancelar convite.' }
  }
}

/**
 * Busca todos os convites pendentes de uma organização
 */
export async function getOfficePendingInvitesAction(orgId: string) {
  try {
    await requireAuth()
    await requireOrgAccess(orgId)

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('organization_invites')
      .select('*, access_profiles(id, name, color)')
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message, invites: [] }
    }

    return { success: true, invites: data || [] }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao buscar convites.', invites: [] }
  }
}

/**
 * Atualiza o perfil de acesso dinâmico de um membro
 */
export async function updateMemberProfileAction(
  orgId: string,
  memberId: string,
  profileId: string
): Promise<{ success: boolean; error?: string }> {
  const { supabase } = await requireAuth()
  await requirePermission(orgId, 'settings_team')

  // Busca dados do perfil selecionado
  const { data: profile } = await supabase
    .from('access_profiles')
    .select('id, name, is_owner_profile')
    .eq('id', profileId)
    .eq('organization_id', orgId)
    .single()

  if (!profile) {
    return { success: false, error: 'Perfil de acesso não encontrado.' }
  }

  let fallbackRole: 'owner' | 'admin' | 'collaborator' | 'intern' = 'collaborator'
  const lower = profile.name.toLowerCase()
  if (lower.includes('admin')) fallbackRole = 'admin'
  else if (lower.includes('estag')) fallbackRole = 'intern'
  else if (profile.is_owner_profile) fallbackRole = 'owner'

  const { error } = await supabase
    .from('organization_members')
    .update({
      profile_id: profileId,
      role: fallbackRole,
    })
    .eq('id', memberId)
    .eq('organization_id', orgId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/app/configuracoes/escritorio')
  return { success: true }
}

/**
 * Atualiza o cargo/papel de um membro (legado)
 */
export async function updateMemberRoleAction(
  orgId: string,
  memberId: string,
  newRole: 'owner' | 'admin' | 'collaborator' | 'intern'
): Promise<{ success: boolean; error?: string }> {
  const { supabase } = await requireAuth()
  await requirePermission(orgId, 'settings_team')

  const { error } = await supabase
    .from('organization_members')
    .update({ role: newRole })
    .eq('id', memberId)
    .eq('organization_id', orgId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/app/configuracoes/escritorio')
  return { success: true }
}

/**
 * Remove um membro da organização
 */
export async function removeMemberAction(
  orgId: string,
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  const { supabase } = await requireAuth()
  await requirePermission(orgId, 'settings_team')

  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('id', memberId)
    .eq('organization_id', orgId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/app/configuracoes/escritorio')
  return { success: true }
}

/**
 * Alterna o escritório ativo do usuário gravando o cookie organizeasy_active_org_id
 */
export async function switchActiveOrganizationAction(
  targetOrgId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await requireAuth()

    // Valida se o usuário é membro ou proprietário da organização alvo
    const { data: member } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', targetOrgId)
      .eq('user_id', user.id)
      .maybeSingle()

    let hasAccess = !!member

    if (!hasAccess) {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', targetOrgId)
        .eq('owner_id', user.id)
        .maybeSingle()
      hasAccess = !!org
    }

    if (!hasAccess) {
      return { success: false, error: 'Você não tem permissão para acessar este escritório.' }
    }

    const cookieStore = await cookies()
    cookieStore.set(ACTIVE_ORG_COOKIE, targetOrgId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 ano
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    revalidatePath('/app', 'layout')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao trocar de escritório.' }
  }
}

