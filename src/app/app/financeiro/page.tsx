import { getActiveOrganization } from '@/lib/server/active-org'
import { redirect } from 'next/navigation'
import { hasPermission } from '@/lib/server/guard'
import AccessDenied from '@/components/ui/AccessDenied'
import {
  getFinancialTransactionsAction,
  getFinancialSummaryAction,
  getRecurringExpensesAction,
  getProjectsProfitabilityAction,
  getFutureCashFlowProjectionAction
} from '@/lib/actions/financial'
import { getCompaniesAction } from '@/lib/actions/companies'
import { getClientsAction } from '@/lib/actions/clients'
import FinancialManagerClient from '@/components/financial/FinancialManagerClient'

export const metadata = {
  title: 'Financeiro & Fluxo de Caixa | Orgarq',
  description: 'Controle financeiro completo do escritório de arquitetura, fluxo de caixa, despesas fixas e lucratividade por projeto.',
}

export default async function FinanceiroPage() {
  const { supabase, user, activeOrg, isOwner, userPermissions } = await getActiveOrganization()

  if (!activeOrg) {
    redirect('/onboarding')
  }

  // Proteção de rota
  if (!hasPermission(isOwner, userPermissions, 'module_financial')) {
    return (
      <AccessDenied
        moduleName="Gestão Financeira"
        userProfileName={activeOrg.profile_name}
        userProfileColor={activeOrg.profile_color}
      />
    )
  }

  const orgId = activeOrg.id

  // 2. Busca lista de projetos da organização para dropdowns
  const { data: projectsData } = await supabase
    .from('projects')
    .select('id, code, title, client_name')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  // 3. Busca lista de empresas/fornecedores e clientes para dropdowns
  const [companiesRes, clientsRes] = await Promise.all([
    getCompaniesAction({
      organizationId: orgId,
      status: 'ativo'
    }),
    getClientsAction(orgId)
  ])

  const companies = companiesRes.companies || []
  const clients = clientsRes.clients || []

  // 4. Busca dados financeiros em paralelo
  const [
    transactionsRes,
    summaryRes,
    recurringRes,
    profitabilityRes,
    projectionRes
  ] = await Promise.all([
    getFinancialTransactionsAction({ organizationId: orgId }),
    getFinancialSummaryAction({ organizationId: orgId }),
    getRecurringExpensesAction(orgId),
    getProjectsProfitabilityAction(orgId),
    getFutureCashFlowProjectionAction({ organizationId: orgId, monthsAhead: 6 })
  ])

  const initialTransactions = transactionsRes.transactions || []
  const initialSummary = summaryRes.summary || {
    realizedIncome: 0,
    realizedExpense: 0,
    realizedBalance: 0,
    pendingIncome: 0,
    pendingExpense: 0,
    pendingBalance: 0,
    totalIncome: 0,
    totalExpense: 0,
    projectedBalance: 0,
    overdueExpense: 0,
    overdueIncome: 0,
    overdueCount: 0,
    totalMonthlyFixedExpenses: 0,
    totalMonthlyRecurringIncome: 0,
    totalMonthlyRecurringNet: 0,
    incomesByCategory: [],
    expensesByCategory: []
  }
  const initialRecurringExpenses = recurringRes.expenses || []
  const initialProfitability = profitabilityRes.projects || []
  const initialProjection = projectionRes.timeline || []

  const projectsList = (projectsData || []).map((p) => ({
    id: p.id,
    code: p.code,
    title: p.title,
    client_name: p.client_name
  }))

  const companiesList = (companies || []).map((c) => ({
    id: c.id,
    name: c.name,
    trade_name: c.trade_name
  }))

  const clientsList = (clients || []).map((cl) => ({
    id: cl.id,
    name: cl.name
  }))

  return (
    <FinancialManagerClient
      organizationId={orgId}
      initialTransactions={initialTransactions}
      initialSummary={initialSummary}
      initialRecurringExpenses={initialRecurringExpenses}
      initialProfitability={initialProfitability}
      initialProjection={initialProjection}
      projects={projectsList}
      companies={companiesList}
      clients={clientsList}
      isOwner={isOwner}
      userPermissions={userPermissions}
    />
  )
}
