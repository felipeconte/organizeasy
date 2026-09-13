import { getActiveOrganization } from '@/lib/server/active-org'
import { getFinancialSummaryAction } from '@/lib/actions/financial'
import OverviewDashboardClient, {
  DashboardProject,
  DashboardFinancialSummary,
} from '@/components/dashboard/OverviewDashboardClient'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Visão Geral | Orgarq',
  description: 'Painel executivo do escritório de arquitetura com projetos, aprovações de clientes e controle financeiro.',
}

export default async function DashboardPage() {
  const { supabase, user, activeOrg, isOwner, userPermissions } = await getActiveOrganization()

  if (!activeOrg) {
    redirect('/onboarding')
  }

  // Se o usuário não tiver permissão para o dashboard (Visão Geral), redireciona para o primeiro módulo que ele tem acesso
  if (!isOwner && !userPermissions?.module_dashboard) {
    if (userPermissions?.module_projects) {
      redirect('/app/projetos')
    } else if (userPermissions?.module_clients) {
      redirect('/app/clientes')
    } else if (userPermissions?.module_companies) {
      redirect('/app/empresas')
    } else if (userPermissions?.module_financial) {
      redirect('/app/financeiro')
    } else {
      redirect('/app/configuracoes/perfil')
    }
  }

  const officeName = activeOrg.name
  const primaryOrgId = activeOrg.id

  // 2. Busca perfil do usuário
  const { data: dbProfile } = await supabase
    .from('user_profiles')
    .select('full_name, display_name')
    .eq('user_id', user.id)
    .maybeSingle()

  const meta = user.user_metadata || {}
  const userDisplayName =
    dbProfile?.full_name ||
    dbProfile?.display_name ||
    meta.full_name ||
    meta.display_name ||
    user.email?.split('@')[0] ||
    'Arquiteto'

  // 3. Monta consulta de projetos do escritório ativo com etapas aninhadas
  const { data: projs, error: projsError } = await supabase
    .from('projects')
    .select(`
      id,
      code,
      title,
      client_name,
      client_email,
      typology,
      status,
      area_sqm,
      deadline,
      created_at,
      project_stages (
        id,
        name,
        code,
        stage_order,
        status,
        progress_percent,
        due_date,
        is_client_approval_required,
        deleted_at
      )
    `)
    .eq('organization_id', activeOrg.id)
    .order('created_at', { ascending: false })

  if (projsError) {
    console.error('Erro ao buscar projetos no dashboard:', projsError)
  }

  const rawProjects = projs || []

  // 4. Busca tokens ativos do Portal do Cliente para ações rápidas de cópia
  const projectIds = rawProjects.map((p) => p.id)
  const tokensMap = new Map<string, string>()

  if (projectIds.length > 0) {
    const { data: tokens } = await supabase
      .from('client_access_tokens')
      .select('project_id, token')
      .in('project_id', projectIds)
      .eq('is_revoked', false)

    if (tokens) {
      tokens.forEach((t) => {
        if (t.project_id && t.token) {
          tokensMap.set(t.project_id, t.token)
        }
      })
    }
  }

  // 5. Busca dados consolidados do financeiro para o escritório ativo
  let financialSummary: DashboardFinancialSummary | null = null

  if (primaryOrgId) {
    try {
      const summaryRes = await getFinancialSummaryAction({ organizationId: primaryOrgId })
      if (summaryRes.success && summaryRes.summary) {
        financialSummary = summaryRes.summary as unknown as DashboardFinancialSummary
      }
    } catch (err) {
      console.error('Erro ao buscar resumo financeiro no dashboard:', err)
    }
  }

  // 6. Formata projetos para o componente cliente
  const projects: DashboardProject[] = rawProjects.map((p: any) => ({
    id: p.id,
    code: p.code,
    title: p.title,
    client_name: p.client_name,
    client_email: p.client_email,
    typology: p.typology,
    status: p.status || 'ativo',
    area_sqm: p.area_sqm,
    deadline: p.deadline,
    created_at: p.created_at,
    project_stages: (p.project_stages || []).filter((s: any) => !s.deleted_at),
    portalToken: tokensMap.get(p.id) || null,
  }))

  return (
    <OverviewDashboardClient
      officeName={officeName}
      userDisplayName={userDisplayName}
      projects={projects}
      financialSummary={financialSummary}
      hasPrimaryOrg={Boolean(primaryOrgId)}
    />
  )
}
