'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  signClientPortalAccessCookie,
  verifyClientPortalAccessCookie,
} from '@/lib/server/client-auth-crypto'

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

  const supabase = await createClient()

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

  // Gera cookie assinado com 30 dias de validade
  const token = signClientPortalAccessCookie({
    portalToken,
    clientId: client.id,
    organizationId: client.organization_id,
  })

  const cookieStore = await cookies()
  cookieStore.set(getCookieName(portalToken), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  })

  return { success: true }
}

/**
 * 2. DESBLOQUEIA A SESSÃO DO PORTAL A PARTIR DE UM ACESSO AUTORIZADO (EX: LINK MÁGICO DE PROJETO)
 */
export async function unlockClientPortalSessionAction(portalToken: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: client } = await supabase
      .from('clients')
      .select('id, organization_id')
      .eq('portal_token', portalToken)
      .maybeSingle()

    if (!client) return false

    const token = signClientPortalAccessCookie({
      portalToken,
      clientId: client.id,
      organizationId: client.organization_id,
    })

    const cookieStore = await cookies()
    cookieStore.set(getCookieName(portalToken), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
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
  }
  clientName?: string
  data?: ClientPortalOfficeData
  error?: string
}> {
  const supabase = await createClient()

  // 1. Busca cliente pelo portal_token
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id, organization_id, name, email, phone, document_number, person_type, address, city, state, zip_code, portal_token')
    .eq('portal_token', portalToken)
    .maybeSingle()

  if (clientErr || !client) {
    return { success: false, isUnlocked: false, error: 'NOT_FOUND' }
  }

  // 2. Busca informações do escritório
  const { data: orgData } = await (supabase
    .from('organizations') as any)
    .select('id, name, logo_url, phone, email, cau_caubr')
    .eq('id', client.organization_id)
    .single()

  const office = {
    id: client.organization_id,
    name: orgData?.name || 'Escritório',
    logo_url: orgData?.logo_url || null,
    phone: orgData?.phone || null,
    email: orgData?.email || null,
    cau_caubr: orgData?.professional_council_id || orgData?.cau_caubr || null,
    professional_council_id: orgData?.professional_council_id || orgData?.cau_caubr || null,
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

    const totalStages = stages.length
    const completedStages = stages.filter((s: any) => s.status === 'concluido').length
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

