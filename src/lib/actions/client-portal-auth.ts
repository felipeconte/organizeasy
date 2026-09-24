'use server'

import { cookies } from 'next/headers'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
  signClientPortalAccessCookie,
  verifyClientPortalAccessCookie,
  signProjectPortalAccessCookie,
  verifyProjectPortalAccessCookie,
  signOfficePortalCookie,
  verifyOfficePortalCookie,
  generateClientAccessCode,
  hashAccessCode,
} from '@/lib/server/client-auth-crypto'
import { sendClientPortalAccessDetailsEmail } from '@/lib/server/email'

export interface ClientPortalProjectCard {
  id: string
  code: string
  title: string
  typology: string | null
  status: string
  deadline: string | null
  progress_percent: number
  total_stages: number
  completed_stages: number
  current_stage_name?: string
  is_pending_client_approval: boolean
  portal_token?: string
}

export interface ClientPortalOfficeData {
  client: {
    id: string
    name: string
    email: string | null
    phone: string | null
    document_number: string | null
    address: string | null
    city: string | null
    state: string | null
    zip_code: string | null
    portal_token: string
  }
  office: {
    id: string
    name: string
    logo_url: string | null
    phone: string | null
    email: string | null
    cau_caubr: string | null
    professional_council_id?: string | null
  }
  projects: ClientPortalProjectCard[]
}

const getCookieName = (portalToken: string) => `organizeasy_cp_${portalToken}`
const getLegacyCookieName = (portalToken: string) => `orgarq_cp_${portalToken}`
const getProjectCookieName = (projectToken: string) => `organizeasy_proj_${projectToken}`

/**
 * 1. VALIDA O CÓDIGO DE ACESSO DO PORTAL DO CLIENTE E CRIA SESSÃO SEGURA
 */
export async function verifyClientPortalAccessCodeAction(
  portalToken: string,
  accessCode: string
): Promise<{
  success: boolean
  error?: string
}> {
  if (!portalToken) {
    return { success: false, error: 'Token do portal inválido.' }
  }

  const cleanCode = (accessCode || '').trim().toUpperCase()
  if (!cleanCode) {
    return { success: false, error: 'Por favor, informe o código de acesso.' }
  }

  const supabase = createAdminClient()

  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id, organization_id, access_code, name')
    .eq('portal_token', portalToken)
    .maybeSingle()

  if (clientErr || !client) {
    return { success: false, error: 'Portal do cliente não encontrado.' }
  }

  const expectedCode = (client.access_code || '').trim().toUpperCase()
  if (cleanCode !== expectedCode) {
    return {
      success: false,
      error: 'Código de acesso incorreto. Verifique o código enviado pelo seu escritório.',
    }
  }

  // Gera cookie assinado com 30 minutos de validade
  const token = signClientPortalAccessCookie({
    portalToken,
    clientId: client.id,
    organizationId: client.organization_id,
    codeHash: hashAccessCode(client.access_code || ''),
    durationMinutes: 30,
  })

  const cookieStore = await cookies()
  cookieStore.set(getCookieName(portalToken), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 60, // 30 minutos
  })

  return { success: true }
}

/**
 * 2. DESBLOQUEIA A SESSÃO DO PORTAL A PARTIR DE UM ACESSO AUTORIZADO (EX: LINK MÁGICO DE PROJETO)
 */
export async function unlockClientPortalSessionAction(portalToken: string): Promise<boolean> {
  try {
    const supabase = createAdminClient()
    const { data: client } = await supabase
      .from('clients')
      .select('id, organization_id, access_code')
      .eq('portal_token', portalToken)
      .maybeSingle()

    if (!client) return false

    const token = signClientPortalAccessCookie({
      portalToken,
      clientId: client.id,
      organizationId: client.organization_id,
      codeHash: hashAccessCode(client.access_code || ''),
      durationMinutes: 30,
    })

    const cookieStore = await cookies()
    cookieStore.set(getCookieName(portalToken), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 60, // 30 minutos
    })

    return true
  } catch {
    return false
  }
}

/**
 * 3. RECUPERA OS DADOS DO PORTAL DO CLIENTE NO ESCRITÓRIO
 */
export async function getClientPortalOfficeDataAction(portalToken: string): Promise<{
  success: boolean
  isUnlocked: boolean
  office?: {
    id: string
    name: string
    logo_url: string | null
    phone: string | null
    email: string | null
    cau_caubr: string | null
    professional_council_id?: string | null
  }
  clientName?: string
  data?: ClientPortalOfficeData
  sessionExpiresAt?: number
  error?: string
}> {
  const supabase = createAdminClient()

  // 1. Busca cliente pelo portal_token
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id, organization_id, name, email, phone, document_number, person_type, address, city, state, zip_code, portal_token, access_code')
    .eq('portal_token', portalToken)
    .maybeSingle()

  if (clientErr || !client) {
    return { success: false, isUnlocked: false, error: 'NOT_FOUND' }
  }

  // 2. Busca informações do escritório
  let { data: orgData, error: orgErr } = await (supabase
    .from('organizations') as any)
    .select('id, name, logo_url, phone, email, professional_council_id')
    .eq('id', client.organization_id)
    .maybeSingle()

  if (orgErr && (orgErr.message?.includes('professional_council_id') || orgErr.code === '42703')) {
    const fallback = await (supabase
      .from('organizations') as any)
      .select('id, name, logo_url, phone, email, cau_caubr')
      .eq('id', client.organization_id)
      .maybeSingle()
    orgData = fallback.data
  }

  const office = {
    id: client.organization_id,
    name: orgData?.name || 'Escritório',
    logo_url: orgData?.logo_url || null,
    phone: orgData?.phone || null,
    email: orgData?.email || null,
    cau_caubr: orgData?.professional_council_id || (orgData as any)?.cau_caubr || null,
    professional_council_id: orgData?.professional_council_id || (orgData as any)?.cau_caubr || null,
  }

  // 3. Verifica se a sessão está desbloqueada pelo cookie
  const cookieStore = await cookies()
  const cookieVal = cookieStore.get(getCookieName(portalToken))?.value || cookieStore.get(getLegacyCookieName(portalToken))?.value
  const session = cookieVal ? verifyClientPortalAccessCookie(cookieVal, portalToken) : null

  if (!session) {
    return {
      success: true,
      isUnlocked: false,
      office,
      clientName: client.name,
    }
  }

  // Valida integridade do código de acesso
  const currentCodeHash = hashAccessCode(client.access_code || '')
  if (session.codeHash && session.codeHash !== currentCodeHash) {
    cookieStore.delete(getCookieName(portalToken))
    cookieStore.delete(getLegacyCookieName(portalToken))
    return {
      success: true,
      isUnlocked: false,
      office,
      clientName: client.name,
    }
  }

  // 4. Sessão desbloqueada: busca todos os projetos vinculados a este cliente neste escritório
  const { data: pcRows } = await supabase
    .from('project_clients')
    .select('project_id')
    .eq('client_id', client.id)

  const linkedProjectIds = (pcRows || []).map((r) => r.project_id)

  let projectQuery = supabase
    .from('projects')
    .select(`
      id,
      code,
      title,
      typology,
      status,
      deadline,
      organization_id,
      created_at,
      project_stages(
        id,
        name,
        stage_order,
        status,
        progress_percent,
        is_client_approval_required
      )
    `)
    .eq('organization_id', client.organization_id)

  if (linkedProjectIds.length > 0) {
    projectQuery = projectQuery.or(`id.in.(${linkedProjectIds.join(',')}),client_id.eq.${client.id}`)
  } else {
    projectQuery = projectQuery.eq('client_id', client.id)
  }

  const { data: projects, error: projErr } = await projectQuery.order('created_at', { ascending: false })

  if (projErr) {
    console.error('Erro ao buscar projetos do cliente no portal:', projErr)
  }

  const projectCards: ClientPortalProjectCard[] = (projects || []).map((p: any) => {
    const stages = (p.project_stages || []).sort(
      (a: any, b: any) => (a.stage_order || 0) - (b.stage_order || 0)
    )

    // Calcula o progresso refletindo as etapas exibidas para o cliente (mesma regra da linha do tempo)
    const clientStages = stages.filter((s: any) => s.is_client_approval_required !== false)
    const totalStages = clientStages.length
    const completedStages = clientStages.filter(
      (s: any) => s.status === 'concluido' || s.status === 'aprovado'
    ).length
    const progressPercent = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0

    const pendingApprovalStage = stages.find(
      (s: any) => s.status === 'em_aprovacao' && s.is_client_approval_required !== false
    )
    const activeStage =
      pendingApprovalStage ||
      stages.find((s: any) => s.status === 'em_producao') ||
      stages.find((s: any) => s.status === 'a_iniciar') ||
      stages[stages.length - 1]

    return {
      id: p.id,
      code: p.code,
      title: p.title,
      typology: p.typology,
      status: p.status,
      deadline: p.deadline,
      progress_percent: progressPercent,
      total_stages: totalStages,
      completed_stages: completedStages,
      current_stage_name: activeStage?.name || undefined,
      is_pending_client_approval: Boolean(pendingApprovalStage),
    }
  })

  return {
    success: true,
    isUnlocked: true,
    office,
    clientName: client.name,
    sessionExpiresAt: session.exp,
    data: {
      client: {
        id: client.id,
        name: client.name,
        email: client.email || null,
        phone: client.phone || null,
        document_number: client.document_number || null,
        address: client.address || null,
        city: client.city || null,
        state: client.state || null,
        zip_code: client.zip_code || null,
        portal_token: client.portal_token || '',
      },
      office,
      projects: projectCards,
    },
  }
}

/**
 * 4. ENCERRA A SESSÃO DO PORTAL ESPECÍFICO DO CLIENTE
 */
export async function clientPortalLogoutAction(portalToken?: string): Promise<{ success: boolean }> {
  if (portalToken) {
    const cookieStore = await cookies()
    cookieStore.delete(getCookieName(portalToken))
    cookieStore.delete(getLegacyCookieName(portalToken))
  }
  return { success: true }
}

/**
 * 5. CONSULTA SE O LINK DIRETO DO PROJETO ESTÁ DESBLOQUEADO OU OBTÉM DADOS DO DESAFIO
 */
export async function getProjectPortalChallengeInfoAction(projectToken: string): Promise<{
  success: boolean
  isUnlocked: boolean
  clientId?: string
  clientName?: string
  project?: {
    id: string
    title: string
    code: string
  }
  office?: {
    name: string
    logo_url: string | null
  }
  sessionExpiresAt?: number
  error?: string
}> {
  const cookieStore = await cookies()
  const cookieVal = cookieStore.get(getProjectCookieName(projectToken))?.value
  const session = cookieVal ? verifyProjectPortalAccessCookie(cookieVal, projectToken) : null

  if (session?.clientId) {
    const supabase = createAdminClient()
    const { data: client } = await supabase
      .from('clients')
      .select('id, access_code')
      .eq('id', session.clientId)
      .maybeSingle()

    const currentHash = hashAccessCode(client?.access_code || '')
    if (client && (!session.codeHash || session.codeHash === currentHash)) {
      return {
        success: true,
        isUnlocked: true,
        clientId: session.clientId,
        clientName: session.clientName,
        sessionExpiresAt: session.exp,
      }
    } else {
      cookieStore.delete(getProjectCookieName(projectToken))
    }
  }

  const supabase = createAdminClient()

  // 1. Busca token do projeto
  const { data: tokenRecord, error: tokenErr } = await supabase
    .from('client_access_tokens')
    .select('project_id, is_revoked, expires_at')
    .eq('token', projectToken)
    .eq('is_revoked', false)
    .maybeSingle()

  if (tokenErr || !tokenRecord?.project_id) {
    return { success: false, isUnlocked: false, error: 'NOT_FOUND' }
  }

  // 2. Busca projeto e escritório
  const { data: project } = await supabase
    .from('projects')
    .select('id, code, title, organization_id, organizations(name, logo_url)')
    .eq('id', tokenRecord.project_id)
    .single()

  if (!project) {
    return { success: false, isUnlocked: false, error: 'NOT_FOUND' }
  }

  const org = project.organizations as any

  return {
    success: true,
    isUnlocked: false,
    project: {
      id: project.id,
      title: project.title,
      code: project.code,
    },
    office: {
      name: org?.name || 'Escritório',
      logo_url: org?.logo_url || null,
    },
  }
}

/**
 * 6. VALIDA O CÓDIGO DE ACESSO DO CLIENTE PARA O PROJETO ESPECÍFICO
 */
export async function verifyProjectPortalAccessCodeAction(
  projectToken: string,
  accessCode: string
): Promise<{
  success: boolean
  clientId?: string
  clientName?: string
  portalToken?: string | null
  error?: string
}> {
  if (!projectToken) {
    return { success: false, error: 'Token do projeto inválido.' }
  }

  const cleanCode = (accessCode || '').trim().toUpperCase()
  if (!cleanCode) {
    return { success: false, error: 'Por favor, informe seu código de acesso de 6 caracteres.' }
  }

  const supabase = createAdminClient()

  // 1. Valida token
  const { data: tokenRecord } = await supabase
    .from('client_access_tokens')
    .select('project_id, is_revoked')
    .eq('token', projectToken)
    .eq('is_revoked', false)
    .maybeSingle()

  if (!tokenRecord?.project_id) {
    return { success: false, error: 'Link do projeto inválido ou expirado.' }
  }

  const projectId = tokenRecord.project_id

  // 2. Busca projeto
  const { data: project } = await supabase
    .from('projects')
    .select('id, client_id, organization_id')
    .eq('id', projectId)
    .single()

  if (!project) {
    return { success: false, error: 'Projeto não encontrado.' }
  }

  // 3. Busca todos os clientes vinculados a este projeto
  const { data: pcRows } = await supabase
    .from('project_clients')
    .select('client_id, clients(id, name, email, portal_token, access_code)')
    .eq('project_id', projectId)

  const linkedClients: any[] = []
  if (pcRows && pcRows.length > 0) {
    pcRows.forEach((r: any) => {
      if (r.clients) linkedClients.push(r.clients)
    })
  }

  // Fallback se não houver múltiplos em project_clients
  if (linkedClients.length === 0 && project.client_id) {
    const { data: singleClient } = await supabase
      .from('clients')
      .select('id, name, email, portal_token, access_code')
      .eq('id', project.client_id)
      .maybeSingle()
    if (singleClient) linkedClients.push(singleClient)
  }

  // Procura qual cliente vinculado possui este código de acesso
  const matchedClient = linkedClients.find(
    (c) => (c.access_code || '').trim().toUpperCase() === cleanCode
  )

  if (!matchedClient) {
    return {
      success: false,
      error: 'Código de acesso incorreto ou não autorizado para este projeto.',
    }
  }

  // Cria cookie assinado da sessão para este projeto específico (30 minutos)
  const projectSessionToken = signProjectPortalAccessCookie({
    projectToken,
    clientId: matchedClient.id,
    organizationId: project.organization_id,
    clientName: matchedClient.name,
    codeHash: hashAccessCode(matchedClient.access_code || ''),
    durationMinutes: 30,
  })

  const cookieStore = await cookies()
  cookieStore.set(getProjectCookieName(projectToken), projectSessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 60, // 30 minutos
  })

  // Se o cliente possuir portal_token individual, também já desbloqueia sua sessão geral!
  if (matchedClient.portal_token) {
    const clientSessionToken = signClientPortalAccessCookie({
      portalToken: matchedClient.portal_token,
      clientId: matchedClient.id,
      organizationId: project.organization_id,
      codeHash: hashAccessCode(matchedClient.access_code || ''),
      durationMinutes: 30,
    })
    cookieStore.set(getCookieName(matchedClient.portal_token), clientSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 60, // 30 minutos
    })
  }

  return {
    success: true,
    clientId: matchedClient.id,
    clientName: matchedClient.name,
    portalToken: matchedClient.portal_token,
  }
}

/**
 * 7. ENCERRA A SESSÃO DO LINK DIRETO DO PROJETO
 */
export async function projectPortalLogoutAction(projectToken: string): Promise<{ success: boolean }> {
  if (projectToken) {
    const cookieStore = await cookies()
    cookieStore.delete(getProjectCookieName(projectToken))
  }
  return { success: true }
}

// ==============================================================================
// STUBS DE COMPATIBILIDADE PARA MÓDULOS LEGADOS (DESCONTINUADOS)
// ==============================================================================
export type ClientPortalDashboardData = any

export async function getClientPortalSession(): Promise<any | null> {
  return null
}

export async function refreshClientPortalSession(_sessionData: any): Promise<void> {}

export async function clientPortalLoginAction(_formData: FormData): Promise<{
  success: boolean
  error?: string
}> {
  return { success: false, error: 'O login por CPF foi descontinuado. Utilize o Magic Link do seu escritório.' }
}

// ==============================================================================
// 8. PORTAL UNIFICADO POR SLUG DO ESCRITÓRIO (/portal/[slug])
// ==============================================================================

const getOfficeCookieName = (slug: string) => `organizeasy_portal_${slug.toLowerCase()}`

export interface OfficePortalDataResult {
  success: boolean
  error?: string
  office?: {
    id: string
    name: string
    slug: string
    logo_url: string | null
    phone: string | null
    email: string | null
    cau_caubr?: string | null
    professional_council_id?: string | null
  }
  client?: {
    id: string
    name: string
    email: string | null
    phone: string | null
    document_number: string | null
    address: string | null
    city: string | null
    state: string | null
    zip_code: string | null
    portal_token?: string | null
  }
  projects?: ClientPortalProjectCard[]
  data?: ClientPortalOfficeData
  isAuthenticated: boolean
  sessionExpiresAt?: number
}

export async function getOfficePortalDataAction(orgSlug: string): Promise<OfficePortalDataResult> {
  const supabase = createAdminClient()
  const cleanSlug = orgSlug.trim().toLowerCase()

  // 1. Busca escritório pelo slug
  const { data: orgData, error: orgErr } = await (supabase
    .from('organizations') as any)
    .select('id, name, slug, logo_url, phone, email, professional_council_id')
    .eq('slug', cleanSlug)
    .maybeSingle()

  if (orgErr || !orgData) {
    return { success: false, isAuthenticated: false, error: 'OFFICE_NOT_FOUND' }
  }

  const office = {
    id: orgData.id,
    name: orgData.name || 'Escritório',
    slug: orgData.slug,
    logo_url: orgData.logo_url || null,
    phone: orgData.phone || null,
    email: orgData.email || null,
    cau_caubr: orgData.professional_council_id || null,
    professional_council_id: orgData.professional_council_id || null,
  }

  // 2. Verifica se existe sessão autenticada para este escritório
  const cookieStore = await cookies()
  const cookieVal = cookieStore.get(getOfficeCookieName(cleanSlug))?.value
  const session = cookieVal ? verifyOfficePortalCookie(cookieVal, cleanSlug) : null

  if (!session) {
    return { success: true, isAuthenticated: false, office }
  }

  // 3. Busca cliente autenticado
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id, organization_id, name, email, phone, document_number, person_type, address, city, state, zip_code, portal_token, access_code')
    .eq('id', session.clientId)
    .eq('organization_id', orgData.id)
    .maybeSingle()

  if (clientErr || !client) {
    return { success: true, isAuthenticated: false, office }
  }

  // Valida integridade do código de acesso (desloga se o código tiver sido regerado)
  const currentCodeHash = hashAccessCode(client.access_code || '')
  if (session.codeHash && session.codeHash !== currentCodeHash) {
    cookieStore.delete(getOfficeCookieName(cleanSlug))
    return { success: true, isAuthenticated: false, office }
  }

  // 4. Busca projetos vinculados ao cliente
  const { data: pcRows } = await supabase
    .from('project_clients')
    .select('project_id')
    .eq('client_id', client.id)

  const linkedProjectIds = (pcRows || []).map((r) => r.project_id)

  let projectQuery = supabase
    .from('projects')
    .select(`
      id,
      code,
      title,
      typology,
      status,
      deadline,
      organization_id,
      created_at,
      project_stages(
        id,
        name,
        stage_order,
        status,
        progress_percent,
        is_client_approval_required
      )
    `)
    .eq('organization_id', orgData.id)

  if (linkedProjectIds.length > 0) {
    projectQuery = projectQuery.or(`id.in.(${linkedProjectIds.join(',')}),client_id.eq.${client.id}`)
  } else {
    projectQuery = projectQuery.eq('client_id', client.id)
  }

  const { data: projects } = await projectQuery.order('created_at', { ascending: false })

  const projectIds = (projects || []).map((p: any) => p.id)
  const tokenMap = new Map<string, string>()

  if (projectIds.length > 0) {
    const { data: tokens } = await supabase
      .from('client_access_tokens')
      .select('project_id, token')
      .in('project_id', projectIds)
      .eq('is_revoked', false)
      .order('created_at', { ascending: false })

    ;(tokens || []).forEach((t) => {
      if (!tokenMap.has(t.project_id)) {
        tokenMap.set(t.project_id, t.token)
      }
    })
  }

  const projectCards: ClientPortalProjectCard[] = (projects || []).map((p: any) => {
    const stages = (p.project_stages || []).sort(
      (a: any, b: any) => (a.stage_order || 0) - (b.stage_order || 0)
    )

    // Calcula o progresso refletindo as etapas exibidas para o cliente (mesma regra da linha do tempo)
    const clientStages = stages.filter((s: any) => s.is_client_approval_required !== false)
    const totalStages = clientStages.length
    const completedStages = clientStages.filter(
      (s: any) => s.status === 'concluido' || s.status === 'aprovado'
    ).length
    const progressPercent = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0

    const pendingApprovalStage = stages.find(
      (s: any) => s.status === 'em_aprovacao' && s.is_client_approval_required !== false
    )
    const activeStage =
      pendingApprovalStage ||
      stages.find((s: any) => s.status === 'em_producao') ||
      stages.find((s: any) => s.status === 'a_iniciar') ||
      stages[stages.length - 1]

    return {
      id: p.id,
      code: p.code,
      title: p.title,
      typology: p.typology,
      status: p.status,
      deadline: p.deadline,
      progress_percent: progressPercent,
      total_stages: totalStages,
      completed_stages: completedStages,
      current_stage_name: activeStage?.name || undefined,
      is_pending_client_approval: Boolean(pendingApprovalStage),
      portal_token: tokenMap.get(p.id) || p.id,
    }
  })

  const officeData: ClientPortalOfficeData = {
    client: {
      id: client.id,
      name: client.name,
      email: client.email || null,
      phone: client.phone || null,
      document_number: client.document_number || null,
      address: client.address || null,
      city: client.city || null,
      state: client.state || null,
      zip_code: client.zip_code || null,
      portal_token: client.portal_token || '',
    },
    office,
    projects: projectCards,
  }

  return {
    success: true,
    isAuthenticated: true,
    office,
    client: officeData.client,
    projects: projectCards,
    data: officeData,
    sessionExpiresAt: session.exp,
  }
}

export async function loginOfficePortalWithCodeAction(
  orgSlug: string,
  accessCode: string
): Promise<{ success: boolean; error?: string; clientName?: string }> {
  const supabase = createAdminClient()
  const cleanSlug = orgSlug.trim().toLowerCase()
  const cleanCode = accessCode.trim().toUpperCase()

  if (!cleanCode || cleanCode.length < 4) {
    return { success: false, error: 'Código de acesso inválido.' }
  }

  // 1. Busca escritório
  const { data: orgData } = await supabase
    .from('organizations')
    .select('id, slug')
    .eq('slug', cleanSlug)
    .maybeSingle()

  if (!orgData) {
    return { success: false, error: 'Escritório não encontrado.' }
  }

  // 2. Busca cliente pelo código de acesso neste escritório
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, access_code')
    .eq('organization_id', orgData.id)

  const matchedClient = (clients || []).find(
    (c) => (c.access_code || '').trim().toUpperCase() === cleanCode
  )

  if (!matchedClient) {
    return {
      success: false,
      error: 'Código de acesso não encontrado para este escritório. Verifique o código digitado ou solicite o envio para seu e-mail.',
    }
  }

  // 3. Define cookie de sessão do escritório (30 minutos)
  const sessionToken = signOfficePortalCookie({
    orgSlug: cleanSlug,
    orgId: orgData.id,
    clientId: matchedClient.id,
    clientName: matchedClient.name,
    codeHash: hashAccessCode(matchedClient.access_code || ''),
    durationMinutes: 30,
  })

  const cookieStore = await cookies()
  cookieStore.set(getOfficeCookieName(cleanSlug), sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 60, // 30 minutos
  })

  return { success: true, clientName: matchedClient.name }
}

export async function requestOfficePortalEmailCodeAction(
  orgSlug: string,
  email: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  const supabase = createAdminClient()
  const cleanSlug = orgSlug.trim().toLowerCase()
  const cleanEmail = email.trim().toLowerCase()

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Informe um endereço de e-mail válido.' }
  }

  // 1. Busca escritório
  const { data: orgData } = await supabase
    .from('organizations')
    .select('id, name, slug, logo_url, phone, email')
    .eq('slug', cleanSlug)
    .maybeSingle()

  if (!orgData) {
    return { success: false, error: 'Escritório não encontrado.' }
  }

  // 2. Busca cliente pelo e-mail neste escritório
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, email, access_code')
    .eq('organization_id', orgData.id)

  const matchedClient = (clients || []).find(
    (c) => (c.email || '').trim().toLowerCase() === cleanEmail
  )

  if (!matchedClient) {
    return {
      success: false,
      error: 'Este e-mail não foi encontrado entre os clientes cadastrados neste escritório. Verifique o e-mail ou entre em contato com a equipe.',
    }
  }

  let codeToSend = matchedClient.access_code
  if (!codeToSend) {
    codeToSend = generateClientAccessCode()
    await supabase
      .from('clients')
      .update({ access_code: codeToSend })
      .eq('id', matchedClient.id)
  }

  // 3. Envia e-mail
  await sendClientPortalAccessDetailsEmail({
    clientName: matchedClient.name,
    clientEmail: matchedClient.email!,
    officeSlug: orgData.slug,
    accessCode: codeToSend,
    officeName: orgData.name || 'Escritório',
    officeLogo: orgData.logo_url,
    officePhone: orgData.phone,
    officeEmail: orgData.email,
  })

  return {
    success: true,
    message: `Código de acesso enviado com sucesso para ${matchedClient.email}. Verifique sua caixa de entrada!`,
  }
}

export async function officePortalLogoutAction(orgSlug: string): Promise<{ success: boolean }> {
  if (orgSlug) {
    const cookieStore = await cookies()
    cookieStore.delete(getOfficeCookieName(orgSlug))
  }
  return { success: true }
}

export async function getProjectForOfficePortalAction(
  orgSlug: string,
  projectCodeOrId: string
): Promise<{
  success: boolean
  needAuth?: boolean
  error?: string
  project?: any
  office?: any
  client?: { id: string; name: string }
  sessionExpiresAt?: number
}> {
  const supabase = createAdminClient()
  const cleanSlug = orgSlug.trim().toLowerCase()

  // 1. Busca escritório
  const { data: orgData } = await (supabase
    .from('organizations') as any)
    .select('id, name, slug, logo_url, phone, email, professional_council_id')
    .eq('slug', cleanSlug)
    .maybeSingle()

  if (!orgData) {
    return { success: false, error: 'OFFICE_NOT_FOUND' }
  }

  const office = {
    id: orgData.id,
    name: orgData.name || 'Escritório',
    slug: orgData.slug,
    logo_url: orgData.logo_url || null,
    phone: orgData.phone || null,
    email: orgData.email || null,
    cau_caubr: orgData.professional_council_id || null,
    professional_council_id: orgData.professional_council_id || null,
  }

  // 2. Verifica autenticação
  const cookieStore = await cookies()
  const cookieVal = cookieStore.get(getOfficeCookieName(cleanSlug))?.value
  const session = cookieVal ? verifyOfficePortalCookie(cookieVal, cleanSlug) : null

  if (!session) {
    return { success: false, needAuth: true, office }
  }

  // Verifica se o código de acesso ainda é o mesmo (invalida sessão se tiver sido regerado)
  const { data: clientAuthCheck } = await supabase
    .from('clients')
    .select('id, access_code')
    .eq('id', session.clientId)
    .maybeSingle()

  const currentCodeHash = hashAccessCode(clientAuthCheck?.access_code || '')
  if (!clientAuthCheck || (session.codeHash && session.codeHash !== currentCodeHash)) {
    cookieStore.delete(getOfficeCookieName(cleanSlug))
    return { success: false, needAuth: true, office }
  }

  // 3. Busca projeto pelo token de acesso, UUID ou código
  let project: any = null

  // 3.1. Verifica se foi passado o token único do projeto em client_access_tokens
  const { data: tokenRecord } = await supabase
    .from('client_access_tokens')
    .select('project_id')
    .eq('token', projectCodeOrId)
    .eq('is_revoked', false)
    .maybeSingle()

  if (tokenRecord?.project_id) {
    const { data: p } = await supabase
      .from('projects')
      .select('*')
      .eq('id', tokenRecord.project_id)
      .eq('organization_id', orgData.id)
      .maybeSingle()
    project = p
  }

  // 3.2. Se não encontrou por token, tenta buscar por ID (UUID)
  if (!project) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectCodeOrId)
    if (isUuid) {
      const { data: p } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectCodeOrId)
        .eq('organization_id', orgData.id)
        .maybeSingle()
      project = p
    }
  }

  // 3.3. Fallback: busca por código caso não contenha caracteres especiais como barra
  if (!project && !projectCodeOrId.includes('/')) {
    const { data: p } = await supabase
      .from('projects')
      .select('*')
      .eq('code', projectCodeOrId)
      .eq('organization_id', orgData.id)
      .maybeSingle()
    project = p
  }

  if (!project) {
    return { success: false, error: 'PROJECT_NOT_FOUND', office }
  }

  // 4. Valida se o cliente autenticado está vinculado a este projeto
  const { data: pcRows } = await supabase
    .from('project_clients')
    .select('client_id')
    .eq('project_id', project.id)

  const linkedClientIds = (pcRows || []).map((r) => r.client_id)
  if (project.client_id) linkedClientIds.push(project.client_id)

  if (!linkedClientIds.includes(session.clientId)) {
    return {
      success: false,
      error: 'UNAUTHORIZED_FOR_PROJECT',
      office,
      client: { id: session.clientId, name: session.clientName },
    }
  }

  return {
    success: true,
    project,
    office,
    client: { id: session.clientId, name: session.clientName },
    sessionExpiresAt: session.exp,
  }
}

/**
 * 8. RENOVA/ESTENDE A SESSÃO DO PORTAL POR MAIS 30 MINUTOS
 */
export async function extendPortalSessionAction(params: {
  orgSlug?: string
  portalToken?: string
  projectToken?: string
}): Promise<{ success: boolean; error?: string; newExpiresAt?: number }> {
  try {
    const cookieStore = await cookies()
    const supabase = createAdminClient()

    // 1. Caso Escritório Central (/portal/[slug])
    if (params.orgSlug) {
      const cleanSlug = params.orgSlug.trim().toLowerCase()
      const cookieName = getOfficeCookieName(cleanSlug)
      const cookieVal = cookieStore.get(cookieName)?.value
      if (!cookieVal) return { success: false, error: 'Sessão não encontrada.' }

      const session = verifyOfficePortalCookie(cookieVal, cleanSlug)
      if (!session) return { success: false, error: 'Sessão expirada.' }

      const { data: client } = await supabase
        .from('clients')
        .select('id, access_code')
        .eq('id', session.clientId)
        .maybeSingle()

      const currentHash = hashAccessCode(client?.access_code || '')
      if (!client || (session.codeHash && session.codeHash !== currentHash)) {
        cookieStore.delete(cookieName)
        return { success: false, error: 'Código de acesso alterado. Faça login novamente.' }
      }

      const newSessionToken = signOfficePortalCookie({
        orgSlug: cleanSlug,
        orgId: session.orgId,
        clientId: session.clientId,
        clientName: session.clientName,
        codeHash: currentHash,
        durationMinutes: 30,
      })

      cookieStore.set(cookieName, newSessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 60, // 30 minutos
      })

      const decoded = verifyOfficePortalCookie(newSessionToken, cleanSlug)
      return { success: true, newExpiresAt: decoded?.exp || Date.now() + 30 * 60 * 1000 }
    }

    // 2. Caso Portal Geral do Cliente (/portal/[portal_token])
    if (params.portalToken) {
      const cookieName = getCookieName(params.portalToken)
      const cookieVal =
        cookieStore.get(cookieName)?.value ||
        cookieStore.get(getLegacyCookieName(params.portalToken))?.value
      if (!cookieVal) return { success: false, error: 'Sessão não encontrada.' }

      const session = verifyClientPortalAccessCookie(cookieVal, params.portalToken)
      if (!session) return { success: false, error: 'Sessão expirada.' }

      const { data: client } = await supabase
        .from('clients')
        .select('id, access_code')
        .eq('id', session.clientId)
        .maybeSingle()

      const currentHash = hashAccessCode(client?.access_code || '')
      if (!client || (session.codeHash && session.codeHash !== currentHash)) {
        cookieStore.delete(cookieName)
        cookieStore.delete(getLegacyCookieName(params.portalToken))
        return { success: false, error: 'Código de acesso alterado. Faça login novamente.' }
      }

      const newSessionToken = signClientPortalAccessCookie({
        portalToken: params.portalToken,
        clientId: session.clientId,
        organizationId: session.organizationId,
        codeHash: currentHash,
        durationMinutes: 30,
      })

      cookieStore.set(cookieName, newSessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 60, // 30 minutos
      })

      const decoded = verifyClientPortalAccessCookie(newSessionToken, params.portalToken)
      return { success: true, newExpiresAt: decoded?.exp || Date.now() + 30 * 60 * 1000 }
    }

    // 3. Caso Projeto Específico (/portal/projeto/[token])
    if (params.projectToken) {
      const cookieName = getProjectCookieName(params.projectToken)
      const cookieVal = cookieStore.get(cookieName)?.value
      if (!cookieVal) return { success: false, error: 'Sessão não encontrada.' }

      const session = verifyProjectPortalAccessCookie(cookieVal, params.projectToken)
      if (!session) return { success: false, error: 'Sessão expirada.' }

      const { data: client } = await supabase
        .from('clients')
        .select('id, access_code')
        .eq('id', session.clientId)
        .maybeSingle()

      const currentHash = hashAccessCode(client?.access_code || '')
      if (!client || (session.codeHash && session.codeHash !== currentHash)) {
        cookieStore.delete(cookieName)
        return { success: false, error: 'Código de acesso alterado. Faça login novamente.' }
      }

      const newSessionToken = signProjectPortalAccessCookie({
        projectToken: params.projectToken,
        clientId: session.clientId,
        organizationId: session.organizationId,
        clientName: session.clientName,
        codeHash: currentHash,
        durationMinutes: 30,
      })

      cookieStore.set(cookieName, newSessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 60, // 30 minutos
      })

      const decoded = verifyProjectPortalAccessCookie(newSessionToken, params.projectToken)
      return { success: true, newExpiresAt: decoded?.exp || Date.now() + 30 * 60 * 1000 }
    }

    return { success: false, error: 'Nenhum parâmetro de portal informado.' }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao estender sessão.' }
  }
}


