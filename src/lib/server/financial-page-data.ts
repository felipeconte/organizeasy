import { getCompaniesAction } from '@/lib/actions/companies'
import { getClientsAction } from '@/lib/actions/clients'
import {
  getFinancialTransactionsAction,
  getFinancialSummaryAction,
  getRecurringExpensesAction,
  getProjectsProfitabilityAction,
  getFutureCashFlowProjectionAction
} from '@/lib/actions/financial'
import {
  FinancialTransaction,
  FinancialSummary,
  RecurringExpense,
  ProjectProfitabilityItem,
  MonthCashFlowProjection
} from '@/types/financial'

export interface FinancialPageData {
  organizationId: string
  initialTransactions: FinancialTransaction[]
  initialSummary: FinancialSummary
  initialRecurringExpenses: RecurringExpense[]
  initialProfitability: ProjectProfitabilityItem[]
  initialProjection: MonthCashFlowProjection[]
  projects: { id: string; code: string; title: string; client_name?: string }[]
  companies: { id: string; name: string; trade_name?: string | null }[]
  clients: { id: string; name: string }[]
}

export async function getFinancialPageData(
  orgId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<FinancialPageData> {
  // 1. Busca lista de projetos da organização para dropdowns
  const { data: projectsData } = await supabase
    .from('projects')
    .select('id, code, title, client_name')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  // 2. Busca lista de empresas/fornecedores e clientes para dropdowns
  const [companiesRes, clientsRes] = await Promise.all([
    getCompaniesAction({
      organizationId: orgId,
      status: 'ativo'
    }),
    getClientsAction(orgId)
  ])

  const companies = companiesRes.companies || []
  const clients = clientsRes.clients || []

  // 3. Busca dados financeiros consolidados em paralelo
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projectsList = (projectsData || []).map((p: any) => ({
    id: p.id,
    code: p.code,
    title: p.title,
    client_name: p.client_name
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const companiesList = (companies || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    trade_name: c.trade_name
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientsList = (clients || []).map((cl: any) => ({
    id: cl.id,
    name: cl.name
  }))

  return {
    organizationId: orgId,
    initialTransactions,
    initialSummary,
    initialRecurringExpenses,
    initialProfitability,
    initialProjection,
    projects: projectsList,
    companies: companiesList,
    clients: clientsList
  }
}
