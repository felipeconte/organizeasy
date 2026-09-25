'use client'

import { useState, useMemo, useTransition, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  Plus,
  Search,
  Calendar,
  Building2,
  FolderGit2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Repeat,
  Sparkles,
  Layers,
  ChevronRight,
  ChevronLeft,
  Edit2,
  ChevronDown,
  SlidersHorizontal,
  Briefcase,
  Check,
  X,
  LayoutGrid,
  List
} from 'lucide-react'
import {
  FinancialTransaction,
  RecurringExpense,
  FinancialSummary,
  ProjectProfitabilityItem,
  MonthCashFlowProjection,
  FINANCIAL_CATEGORIES,
  TransactionType,
  TransactionStatus,
  RecurrenceEditScope
} from '@/types/financial'
import {
  toggleTransactionStatusAction,
  getFinancialTransactionsAction,
  getFinancialSummaryAction,
  getRecurringExpensesAction,
  getProjectsProfitabilityAction,
  getFutureCashFlowProjectionAction
} from '@/lib/actions/financial'
import TransactionModal from './TransactionModal'
import { usePermissions } from '@/contexts/PermissionsContext'
import { hasPermission, ProfilePermissions } from '@/types/profiles'

interface ProjectOption {
  id: string
  code: string
  title: string
  client_name?: string
}

interface CompanyOption {
  id: string
  name: string
  trade_name?: string | null
}

interface ClientOption {
  id: string
  name: string
}

interface FinancialManagerClientProps {
  organizationId: string
  initialTransactions: FinancialTransaction[]
  initialSummary: FinancialSummary
  initialRecurringExpenses: RecurringExpense[]
  initialProfitability: ProjectProfitabilityItem[]
  initialProjection: MonthCashFlowProjection[]
  projects: ProjectOption[]
  companies: CompanyOption[]
  clients?: ClientOption[]
  isOwner?: boolean
  userPermissions?: ProfilePermissions
  currentSubPage?: 'visao_geral' | 'lancamentos' | 'lucratividade' | 'projecao'
}

export type PeriodGranularity = 'day' | 'week' | 'month' | 'year' | 'custom' | 'all'
export type DateFilterBasis = 'due_date' | 'payment_date'

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const WEEKDAY_NAMES_PT = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado'
]

function toISODateString(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getMondayToSundayWeek(refDate: Date): { start: Date; end: Date; startStr: string; endStr: string } {
  const d = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate())
  const day = d.getDay() // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return {
    start: monday,
    end: sunday,
    startStr: toISODateString(monday),
    endStr: toISODateString(sunday)
  }
}

function getMonthRange(refDate: Date): { start: Date; end: Date; startStr: string; endStr: string } {
  const year = refDate.getFullYear()
  const month = refDate.getMonth()
  const start = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0).getDate()
  const end = new Date(year, month, lastDay)

  return {
    start,
    end,
    startStr: toISODateString(start),
    endStr: toISODateString(end)
  }
}

function getYearRange(refDate: Date): { start: Date; end: Date; startStr: string; endStr: string } {
  const year = refDate.getFullYear()
  return {
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31),
    startStr: `${year}-01-01`,
    endStr: `${year}-12-31`
  }
}

export default function FinancialManagerClient({
  organizationId,
  initialTransactions,
  initialSummary,
  initialRecurringExpenses,
  initialProfitability,
  initialProjection,
  projects,
  companies,
  isOwner,
  userPermissions,
  currentSubPage = 'visao_geral'
}: FinancialManagerClientProps) {
  const permContext = usePermissions()
  const effectiveIsOwner = isOwner ?? permContext.isOwner
  const effectivePermissions = userPermissions ?? permContext.permissions

  const canCreateEdit = hasPermission(effectiveIsOwner, effectivePermissions, 'financial_create_edit')
  const canViewSensitive = hasPermission(effectiveIsOwner, effectivePermissions, 'financial_view_sensitive')

  // Estado dos dados
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(initialTransactions)
  const [summary, setSummary] = useState<FinancialSummary>(initialSummary)
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>(initialRecurringExpenses)
  const [profitability, setProfitability] = useState<ProjectProfitabilityItem[]>(initialProfitability)
  const [projection, setProjection] = useState<MonthCashFlowProjection[]>(initialProjection)

  // Filtros de listagem de transações
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<TransactionType | 'all'>('all')
  const [selectedStatus, setSelectedStatus] = useState<TransactionStatus | 'all'>('all')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedRecurrence, setSelectedRecurrence] = useState<'all' | 'recurring_only' | 'single_only'>('all')

  // Navegação de Período & Visualização (Inspirado no padrão de Projetos)
  const [periodMode, setPeriodMode] = useState<PeriodGranularity>('month')
  const [selectedRefDate, setSelectedRefDate] = useState<Date>(() => new Date())
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [dateBasis, setDateBasis] = useState<DateFilterBasis>('due_date')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)

  // Estados para o Popover do Calendário Integrado
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => new Date())
  const calendarRef = useRef<HTMLDivElement>(null)

  // Fecha o calendário ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false)
      }
    }
    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isCalendarOpen])

  // Modais
  const [isTxModalOpen, setIsTxModalOpen] = useState(false)
  const [selectedTx, setSelectedTx] = useState<FinancialTransaction | null>(null)
  const [modalDefaultType, setModalDefaultType] = useState<TransactionType>('income')

  const [, startTransition] = useTransition()

  // Formatador de Moeda BRL
  const formatBRL = (val: number) => {
    if (!canViewSensitive) return '••••••'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val || 0)
  }

  // Formatador de Data BR
  const formatDateBR = (dateStr?: string | null) => {
    if (!dateStr) return '-'
    const parts = dateStr.split('T')[0].split('-')
    if (parts.length !== 3) return dateStr
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }

  // Abre modal para criar transação
  const handleOpenNewTransaction = (type: TransactionType = 'income') => {
    setSelectedTx(null)
    setModalDefaultType(type)
    setIsTxModalOpen(true)
  }

  // Abre modal para editar transação
  const handleOpenEditTransaction = (tx: FinancialTransaction) => {
    setSelectedTx(tx)
    setIsTxModalOpen(true)
  }

  // Recarrega todos os cálculos consolidados
  const refreshFinancialData = async () => {
    const [sumRes, txsRes, recRes, profRes, projRes] = await Promise.all([
      getFinancialSummaryAction({ organizationId }),
      getFinancialTransactionsAction({ organizationId }),
      getRecurringExpensesAction(organizationId),
      getProjectsProfitabilityAction(organizationId),
      getFutureCashFlowProjectionAction({ organizationId, monthsAhead: 6 })
    ])

    if (sumRes.success && sumRes.summary) {
      setSummary(sumRes.summary)
    }
    if (txsRes.success && txsRes.transactions) {
      setTransactions(txsRes.transactions)
    }
    if (recRes.success && recRes.expenses) {
      setRecurringExpenses(recRes.expenses)
    }
    if (profRes.success && profRes.projects) {
      setProfitability(profRes.projects)
    }
    if (projRes.success && projRes.timeline) {
      setProjection(projRes.timeline)
    }
  }

  // Callback de sucesso ao salvar/editar/excluir lançamento
  const handleTxSuccess = (
    savedTx: FinancialTransaction,
    isDeleted?: boolean,
    deleteScope: RecurrenceEditScope = 'single'
  ) => {
    let updated: FinancialTransaction[]
    if (isDeleted) {
      if (deleteScope === 'all') {
        updated = transactions.filter(
          (t) => !savedTx.recurring_expense_id || t.recurring_expense_id !== savedTx.recurring_expense_id
        )
      } else if (deleteScope === 'future') {
        updated = transactions.filter(
          (t) =>
            !savedTx.recurring_expense_id ||
            t.recurring_expense_id !== savedTx.recurring_expense_id ||
            Boolean(t.due_date && savedTx.due_date && t.due_date < savedTx.due_date)
        )
      } else {
        updated = transactions.filter((t) => t.id !== savedTx.id)
      }
    } else {
      const exists = transactions.some((t) => t.id === savedTx.id)
      if (exists) {
        updated = transactions.map((t) => (t.id === savedTx.id ? savedTx : t))
      } else {
        updated = [savedTx, ...transactions]
      }
    }
    setTransactions(updated)
    refreshFinancialData()
  }

  // Alterna status pago/pendente com 1 clique
  const handleToggleStatus = async (tx: FinancialTransaction) => {
    const newStatus: TransactionStatus = tx.status === 'paid' ? 'pending' : 'paid'

    // Atualização otimista
    const optimistic = transactions.map((t) =>
      t.id === tx.id
        ? {
          ...t,
          status: newStatus,
          payment_date: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : null
        }
        : t
    )
    setTransactions(optimistic)

    startTransition(async () => {
      await toggleTransactionStatusAction({
        id: tx.id,
        organizationId,
        status: newStatus
      })
      refreshFinancialData()
    })
  }

  // Lista unificada de categorias para o filtro (padrão + personalizadas dos lançamentos)
  const allCategoryOptions = useMemo(() => {
    const set = new Set<string>()
    FINANCIAL_CATEGORIES.forEach((c) => set.add(c.label))
    transactions.forEach((tx) => {
      if (tx.category) {
        const def = FINANCIAL_CATEGORIES.find(
          (c) => c.id === tx.category || c.label === tx.category
        )
        set.add(def ? def.label : tx.category)
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [transactions])

  // Filtro dos lançamentos exibidos na aba Extrato
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Busca
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const matchTitle = tx.title?.toLowerCase().includes(term)
        const matchDesc = tx.description?.toLowerCase().includes(term)
        const matchProj = tx.projects?.title?.toLowerCase().includes(term) || tx.projects?.code?.toLowerCase().includes(term)
        const matchComp = tx.companies?.name?.toLowerCase().includes(term)
        const matchRec = (term === 'recorrente' || term === 'recorrência' || term === 'recorrencia') && Boolean(tx.recurring_expense_id)
        if (!matchTitle && !matchDesc && !matchProj && !matchComp && !matchRec) return false
      }

      // Tipo
      if (selectedType !== 'all' && tx.type !== selectedType) return false

      // Status
      if (selectedStatus !== 'all' && tx.status !== selectedStatus) return false

      // Recorrência
      if (selectedRecurrence === 'recurring_only' && !tx.recurring_expense_id) return false
      if (selectedRecurrence === 'single_only' && tx.recurring_expense_id) return false

      // Projeto
      if (selectedProjectId !== 'all' && tx.project_id !== selectedProjectId) return false

      // Categoria
      if (selectedCategory !== 'all') {
        const selLower = selectedCategory.toLowerCase()
        const txLower = (tx.category || '').toLowerCase()
        const def = FINANCIAL_CATEGORIES.find(
          (c) => c.id.toLowerCase() === selLower || c.label.toLowerCase() === selLower
        )
        const isMatch =
          txLower === selLower ||
          (def && (txLower === def.id.toLowerCase() || txLower === def.label.toLowerCase()))
        if (!isMatch) return false
      }

      // Período de visualização dinâmico
      if (periodMode !== 'all') {
        let startBound = ''
        let endBound = ''

        if (periodMode === 'day') {
          startBound = toISODateString(selectedRefDate)
          endBound = startBound
        } else if (periodMode === 'week') {
          const w = getMondayToSundayWeek(selectedRefDate)
          startBound = w.startStr
          endBound = w.endStr
        } else if (periodMode === 'month') {
          const m = getMonthRange(selectedRefDate)
          startBound = m.startStr
          endBound = m.endStr
        } else if (periodMode === 'year') {
          const y = getYearRange(selectedRefDate)
          startBound = y.startStr
          endBound = y.endStr
        } else if (periodMode === 'custom') {
          startBound = customStartDate
          endBound = customEndDate
        }

        // Determina data do registro conforme a base selecionada (Vencimento ou Data de Pagamento)
        let txDate = ''
        if (dateBasis === 'payment_date') {
          txDate = tx.payment_date || (tx.status === 'paid' ? tx.due_date : '')
        } else {
          txDate = tx.due_date || tx.payment_date || ''
        }

        if (!txDate) return false
        if (startBound && txDate < startBound) return false
        if (endBound && txDate > endBound) return false
      }

      return true
    })
  }, [
    transactions,
    searchTerm,
    selectedType,
    selectedStatus,
    selectedRecurrence,
    selectedProjectId,
    selectedCategory,
    periodMode,
    selectedRefDate,
    customStartDate,
    customEndDate,
    dateBasis
  ])

  // Contadores e manipuladores de filtros
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (selectedType !== 'all') count++
    if (selectedStatus !== 'all') count++
    if (selectedRecurrence !== 'all') count++
    if (selectedProjectId !== 'all') count++
    if (selectedCategory !== 'all') count++
    if (dateBasis !== 'due_date') count++
    return count
  }, [selectedType, selectedStatus, selectedRecurrence, selectedProjectId, selectedCategory, dateBasis])

  const handleResetFilters = () => {
    setSelectedType('all')
    setSelectedStatus('all')
    setSelectedRecurrence('all')
    setSelectedProjectId('all')
    setSelectedCategory('all')
    setDateBasis('due_date')
    setSearchTerm('')
  }


  // Descrição amigável e badges do período ativo
  const periodLabelInfo = useMemo(() => {
    const today = new Date()
    const todayStr = toISODateString(today)
    const refStr = toISODateString(selectedRefDate)

    if (periodMode === 'day') {
      const isToday = refStr === todayStr
      const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
      const isYesterday = refStr === toISODateString(yesterday)
      const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      const isTomorrow = refStr === toISODateString(tomorrow)

      let badge = ''
      if (isToday) badge = 'Hoje'
      else if (isYesterday) badge = 'Ontem'
      else if (isTomorrow) badge = 'Amanhã'

      const dayName = WEEKDAY_NAMES_PT[selectedRefDate.getDay()]
      const text = `${dayName}, ${selectedRefDate.getDate()} de ${MONTH_NAMES_PT[selectedRefDate.getMonth()]} de ${selectedRefDate.getFullYear()}`

      return { text, badge, isCurrent: isToday, resetText: 'Hoje' }
    }

    if (periodMode === 'week') {
      const week = getMondayToSundayWeek(selectedRefDate)
      const isCurrent = week.startStr <= todayStr && todayStr <= week.endStr
      const text = `Semana de ${formatDateBR(week.startStr)} a ${formatDateBR(week.endStr)}`
      return { text, badge: isCurrent ? 'Esta Semana' : '', isCurrent, resetText: 'Esta Semana' }
    }

    if (periodMode === 'month') {
      const isCurrent = selectedRefDate.getFullYear() === today.getFullYear() && selectedRefDate.getMonth() === today.getMonth()
      const text = `${MONTH_NAMES_PT[selectedRefDate.getMonth()]} de ${selectedRefDate.getFullYear()}`
      return { text, badge: isCurrent ? 'Mês Atual' : '', isCurrent, resetText: 'Mês Atual' }
    }

    if (periodMode === 'year') {
      const isCurrent = selectedRefDate.getFullYear() === today.getFullYear()
      const text = `Ano de ${selectedRefDate.getFullYear()}`
      return { text, badge: isCurrent ? 'Ano Atual' : '', isCurrent, resetText: 'Este Ano' }
    }

    if (periodMode === 'custom') {
      let text = 'Intervalo Personalizado'
      if (customStartDate && customEndDate) {
        text = `${formatDateBR(customStartDate)} até ${formatDateBR(customEndDate)}`
      } else if (customStartDate) {
        text = `A partir de ${formatDateBR(customStartDate)}`
      } else if (customEndDate) {
        text = `Até ${formatDateBR(customEndDate)}`
      }
      return { text, badge: 'Personalizado', isCurrent: false, resetText: '' }
    }

    return { text: 'Todo o Histórico', badge: 'Completo', isCurrent: false, resetText: '' }
  }, [periodMode, selectedRefDate, customStartDate, customEndDate])

  // Semanas calculadas para o modo 'week' dentro do calendário
  const monthWeeksList = useMemo(() => {
    const year = calendarViewDate.getFullYear()
    const month = calendarViewDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // Segunda-feira como início da semana (0 = Dom, 1 = Seg, ..., 6 = Sáb)
    const firstDayOfWeek = firstDay.getDay()
    const diffToMon = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek
    const startDate = new Date(year, month, 1 + diffToMon)

    const weeks: {
      start: Date
      end: Date
      startStr: string
      endStr: string
      days: { date: Date; inCurrentMonth: boolean }[]
    }[] = []
    const curr = new Date(startDate)

    while (curr <= lastDay || curr.getDay() !== 1) {
      const weekDays: { date: Date; inCurrentMonth: boolean }[] = []
      const weekStart = new Date(curr)
      for (let i = 0; i < 7; i++) {
        weekDays.push({
          date: new Date(curr),
          inCurrentMonth: curr.getMonth() === month
        })
        curr.setDate(curr.getDate() + 1)
      }
      const weekEnd = new Date(weekDays[6].date)
      weeks.push({
        start: weekStart,
        end: weekEnd,
        startStr: toISODateString(weekStart),
        endStr: toISODateString(weekEnd),
        days: weekDays
      })
      if (curr > lastDay && curr.getDay() === 1) break
    }
    return weeks
  }, [calendarViewDate])

  const firstDayOfWeekDayMode = useMemo(() => {
    return new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1).getDay()
  }, [calendarViewDate])

  const daysInMonthDayMode = useMemo(() => {
    return new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 0).getDate()
  }, [calendarViewDate])

  // Mini-KPIs consolidados do período filtrado
  const periodMetrics = useMemo(() => {
    let paidIncome = 0
    let pendingIncome = 0
    let paidExpense = 0
    let pendingExpense = 0

    filteredTransactions.forEach((tx) => {
      const amt = Number(tx.amount || 0)
      if (tx.type === 'income') {
        if (tx.status === 'paid') {
          paidIncome += amt
        } else {
          pendingIncome += amt
        }
      } else {
        if (tx.status === 'paid') {
          paidExpense += amt
        } else {
          pendingExpense += amt
        }
      }
    })

    const netBalance = paidIncome - paidExpense
    const totalCount = filteredTransactions.length
    const paidCount = filteredTransactions.filter((t) => t.status === 'paid').length
    const pendingCount = totalCount - paidCount

    return {
      paidIncome,
      pendingIncome,
      paidExpense,
      pendingExpense,
      netBalance,
      totalCount,
      paidCount,
      pendingCount,
    }
  }, [filteredTransactions])

  // Contas vencidas ou a vencer nos próximos 7 dias
  const urgentBills = useMemo(() => {
    const today = new Date()
    const next7Days = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7).toISOString().split('T')[0]

    return transactions
      .filter((tx) => tx.type === 'expense' && tx.status !== 'paid' && tx.due_date <= next7Days)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 5)
  }, [transactions])

  const subPageHeaders = {
    visao_geral: {
      title: 'Gestão Financeira do Escritório',
      subtitle: 'Acompanhe receitas, despesas, recorrências e a rentabilidade individual de cada projeto.',
    },
    lancamentos: {
      title: 'Lançamentos e Movimentações',
      subtitle: 'Visualize, filtre e gerencie todas as receitas e despesas do escritório.',
    },
    lucratividade: {
      title: 'Lucratividade por Projeto',
      subtitle: 'Acompanhe a rentabilidade, receitas e custos dedicados de cada projeto.',
    },
    projecao: {
      title: 'Passado, Presente e Futuro',
      subtitle: 'Linha do tempo consolidada e estimativa de fluxo de caixa futuro.',
    },
  }

  const headerInfo = subPageHeaders[currentSubPage] || subPageHeaders.visao_geral

  return (
    <div className="space-y-6 antialiased">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {headerInfo.title}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {headerInfo.subtitle}
          </p>
        </div>

        {canCreateEdit && (
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => handleOpenNewTransaction('expense')}
              className="inline-flex items-center gap-1.5 py-2.5 px-4.5 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-sm font-semibold transition-all shadow-xs cursor-pointer"
            >
              <TrendingDown className="w-4 h-4 text-rose-600" />
              Nova Despesa
            </button>

            <button
              onClick={() => handleOpenNewTransaction('income')}
              className="inline-flex items-center gap-1.5 py-2.5 px-4.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all shadow-xs shadow-emerald-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nova Receita
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO 1: VISÃO GERAL (DASHBOARD) */}
      {/* ========================================================================= */}
      {currentSubPage === 'visao_geral' && (
        <div className="space-y-6">
          {/* Main KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Saldo Realizado */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Saldo Realizado
                </span>
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center ${summary.realizedBalance >= 0
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                    }`}
                >
                  <CircleDollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span
                  className={`text-2xl font-extrabold tracking-tight ${summary.realizedBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                >
                  {formatBRL(summary.realizedBalance)}
                </span>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">
                  Total recebido menos total pago até o momento
                </p>
              </div>
            </div>

            {/* Total Recebido (Entradas) */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Receitas Realizadas
                </span>
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {formatBRL(summary.realizedIncome)}
                </span>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-bold mt-1">
                  <span>+ {formatBRL(summary.pendingIncome)} a receber</span>
                </div>
              </div>
            </div>

            {/* Total Pago (Saídas) */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Despesas Pagas
                </span>
                <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {formatBRL(summary.realizedExpense)}
                </span>
                <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-bold mt-1">
                  <span>+ {formatBRL(summary.pendingExpense)} a pagar</span>
                </div>
              </div>
            </div>

            {/* Recorrências & Custo Fixo */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Recorrências / Mês
                </span>
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Repeat className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-extrabold text-indigo-600 tracking-tight">
                  {formatBRL(summary.totalMonthlyFixedExpenses)}
                </span>
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mt-1">
                  <span>+ {formatBRL(summary.totalMonthlyRecurringIncome || 0)} rec.</span>
                  <span className="text-indigo-700 font-bold">
                    {recurringExpenses.filter((r) => r.is_active).length} ativas
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Alertas e Categorias Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contas a Vencer & Alertas */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Próximos Vencimentos
                </h2>
                <span className="text-[11px] font-bold text-slate-400">7 dias</span>
              </div>

              {urgentBills.length === 0 ? (
                <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="text-xs font-semibold text-slate-600">Nenhuma conta pendente para os próximos 7 dias!</p>
                  <p className="text-[11px] text-slate-400">Seu fluxo de curto prazo está em dia.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {urgentBills.map((bill) => (
                    <div
                      key={bill.id}
                      className="p-3 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 truncate block">{bill.title}</span>
                          {bill.recurring_expense_id && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 shrink-0">
                              Recorrente
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block">
                          Vence em {formatDateBR(bill.due_date)} • {bill.payment_method || 'Boleto'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-bold text-rose-600">
                          {formatBRL(bill.amount)}
                        </span>
                        {canCreateEdit && (
                          <button
                            onClick={() => handleToggleStatus(bill)}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                            title="Marcar como Pago"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Origem das Receitas por Categoria */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                Origem das Receitas
              </h2>

              {summary.incomesByCategory.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Nenhuma receita registrada no período.</p>
              ) : (
                <div className="space-y-3">
                  {summary.incomesByCategory.slice(0, 5).map((item) => (
                    <div key={item.category} className="space-y-1 text-xs">
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-700">{item.label}</span>
                        <span className="text-slate-900 font-mono">{formatBRL(item.amount)}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, item.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Destino das Despesas por Categoria */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
                Destino das Despesas
              </h2>

              {summary.expensesByCategory.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Nenhuma despesa registrada no período.</p>
              ) : (
                <div className="space-y-3">
                  {summary.expensesByCategory.slice(0, 5).map((item) => (
                    <div key={item.category} className="space-y-1 text-xs">
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-700">{item.label}</span>
                        <span className="text-slate-900 font-mono">{formatBRL(item.amount)}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-rose-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, item.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEÇÃO 2: LANÇAMENTOS */}
      {/* ========================================================================= */}
      {currentSubPage === 'lancamentos' && (
        <div className="space-y-4">
          {/* Mini-KPIs Resumo do Período Ativo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Receitas */}
            <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Entradas Realizadas
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-xl font-extrabold text-emerald-600 font-mono tracking-tight">
                  + {formatBRL(periodMetrics.paidIncome)}
                </span>
                <div className="text-[11px] text-slate-400 mt-1 font-medium truncate">
                  {periodMetrics.pendingIncome > 0 ? (
                    <span className="text-emerald-700 font-bold">
                      + {formatBRL(periodMetrics.pendingIncome)} a receber
                    </span>
                  ) : (
                    <span>Todas as receitas liquidadas</span>
                  )}
                </div>
              </div>
            </div>

            {/* Total Despesas */}
            <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Saídas Realizadas
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-xl font-extrabold text-rose-600 font-mono tracking-tight">
                  - {formatBRL(periodMetrics.paidExpense)}
                </span>
                <div className="text-[11px] text-slate-400 mt-1 font-medium truncate">
                  {periodMetrics.pendingExpense > 0 ? (
                    <span className="text-rose-700 font-bold">
                      + {formatBRL(periodMetrics.pendingExpense)} a pagar
                    </span>
                  ) : (
                    <span>Todas as despesas liquidadas</span>
                  )}
                </div>
              </div>
            </div>

            {/* Saldo Líquido do Período */}
            <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Resultado no Período
                </span>
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    periodMetrics.netBalance >= 0
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  <CircleDollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <span
                  className={`text-xl font-extrabold font-mono tracking-tight ${
                    periodMetrics.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {formatBRL(periodMetrics.netBalance)}
                </span>
                <p className="text-[11px] text-slate-400 mt-1 font-medium truncate">
                  {periodMetrics.netBalance >= 0 ? 'Superávit operacional' : 'Déficit no intervalo'}
                </p>
              </div>
            </div>

            {/* Volume de Lançamentos */}
            <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Volume de Lançamentos
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-xl font-extrabold text-slate-900 font-mono tracking-tight">
                  {periodMetrics.totalCount}{' '}
                  <span className="text-xs font-sans text-slate-500 font-medium">itens</span>
                </span>
                <p className="text-[11px] text-slate-400 mt-1 font-medium truncate">
                  <strong className="text-emerald-600">{periodMetrics.paidCount}</strong> pagos •{' '}
                  <strong className="text-amber-600">{periodMetrics.pendingCount}</strong> pendentes
                </p>
              </div>
            </div>
          </div>

          {/* Barra de Filtros & Navegador de Período Inspirada em Projetos */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            {/* Linha 1: Campo de Busca Compacto + Seletor de Período Integrado com Calendário + Modos de Visualização + Filtros */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Campo de Busca Compacto */}
              <div className="relative w-full sm:w-60 lg:w-72 shrink-0">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar lançamentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800 transition-all"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Controles de Direita: Seletor de Granularidade com Popover + Contagem + Alternância Tabela/Cards + Botão Filtros */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {/* Seletor de Período com Calendário Popover Embaixo */}
                <div className="relative" ref={calendarRef}>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Segmented Control de Granularidade */}
                    <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/70 text-xs font-semibold text-slate-600">
                      {(['day', 'week', 'month', 'year', 'custom'] as const).map((mode) => {
                        const labels = {
                          day: 'Dia',
                          week: 'Semana',
                          month: 'Mês',
                          year: 'Ano',
                          custom: 'Período'
                        }
                        const isActive = periodMode === mode
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => {
                              setCalendarViewDate(new Date(selectedRefDate))
                              if (periodMode === mode) {
                                setIsCalendarOpen(!isCalendarOpen)
                              } else {
                                setPeriodMode(mode)
                                setIsCalendarOpen(true)
                              }
                            }}
                            className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                              isActive
                                ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                                : 'hover:text-slate-900'
                            }`}
                          >
                            {labels[mode]}
                          </button>
                        )
                      })}
                    </div>

                    {/* Badge Compacto do Período Ativo (com ícone e chevron para reabrir o calendário) */}
                    <button
                      type="button"
                      onClick={() => {
                        setCalendarViewDate(new Date(selectedRefDate))
                        setIsCalendarOpen(!isCalendarOpen)
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/90 bg-slate-50 hover:bg-white hover:border-emerald-300 text-xs font-bold text-slate-700 transition-all shadow-2xs cursor-pointer group"
                      title="Clique para abrir o calendário e selecionar outra data"
                    >
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate max-w-[140px] sm:max-w-[200px]">
                        {periodLabelInfo.text}
                      </span>
                      {periodLabelInfo.badge && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          {periodLabelInfo.badge}
                        </span>
                      )}
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 transition-transform ${
                          isCalendarOpen ? 'rotate-180 text-emerald-700' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Calendário Popover Suspenso Ancorado Diretamente Abaixo */}
                  {isCalendarOpen && (
                    <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 w-[310px] sm:w-[340px] max-w-[calc(100vw-2rem)] animate-in fade-in zoom-in-95 duration-150">
                      {/* Modo DIA */}
                      {periodMode === 'day' && (
                        <div>
                          {/* Header do Mês e Navegação */}
                          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                            <button
                              type="button"
                              onClick={() =>
                                setCalendarViewDate(
                                  (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                                )
                              }
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                              title="Mês anterior"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold text-slate-800 capitalize">
                              {MONTH_NAMES_PT[calendarViewDate.getMonth()]} de {calendarViewDate.getFullYear()}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setCalendarViewDate(
                                  (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                                )
                              }
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                              title="Próximo mês"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Atalhos Rápidos */}
                          <div className="flex items-center justify-center gap-1.5 pb-2.5 mb-2.5 border-b border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                const d = new Date()
                                d.setDate(d.getDate() - 1)
                                setSelectedRefDate(d)
                                setCalendarViewDate(d)
                                setIsCalendarOpen(false)
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            >
                              Ontem
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const d = new Date()
                                setSelectedRefDate(d)
                                setCalendarViewDate(d)
                                setIsCalendarOpen(false)
                              }}
                              className="px-2 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer"
                            >
                              Hoje
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const d = new Date()
                                d.setDate(d.getDate() + 1)
                                setSelectedRefDate(d)
                                setCalendarViewDate(d)
                                setIsCalendarOpen(false)
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            >
                              Amanhã
                            </button>
                          </div>

                          {/* Cabeçalho dos Dias da Semana */}
                          <div className="grid grid-cols-7 gap-1 text-center mb-1">
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dw, i) => (
                              <span key={i} className="text-[10px] font-bold text-slate-400 uppercase">
                                {dw}
                              </span>
                            ))}
                          </div>

                          {/* Grid de Dias */}
                          <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: firstDayOfWeekDayMode }).map((_, i) => (
                              <div key={`empty-${i}`} className="h-8" />
                            ))}
                            {Array.from({ length: daysInMonthDayMode }).map((_, i) => {
                              const dayNum = i + 1
                              const isSelected =
                                selectedRefDate.getFullYear() === calendarViewDate.getFullYear() &&
                                selectedRefDate.getMonth() === calendarViewDate.getMonth() &&
                                selectedRefDate.getDate() === dayNum
                              const today = new Date()
                              const isToday =
                                today.getFullYear() === calendarViewDate.getFullYear() &&
                                today.getMonth() === calendarViewDate.getMonth() &&
                                today.getDate() === dayNum

                              return (
                                <button
                                  key={dayNum}
                                  type="button"
                                  onClick={() => {
                                    setSelectedRefDate(
                                      new Date(
                                        calendarViewDate.getFullYear(),
                                        calendarViewDate.getMonth(),
                                        dayNum
                                      )
                                    )
                                    setIsCalendarOpen(false)
                                  }}
                                  className={`h-8 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white font-extrabold shadow-2xs'
                                      : isToday
                                      ? 'border border-emerald-500 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 font-bold'
                                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                                  }`}
                                >
                                  {dayNum}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Modo SEMANA */}
                      {periodMode === 'week' && (
                        <div>
                          {/* Header do Mês e Navegação */}
                          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                            <button
                              type="button"
                              onClick={() =>
                                setCalendarViewDate(
                                  (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                                )
                              }
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                              title="Mês anterior"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold text-slate-800 capitalize">
                              {MONTH_NAMES_PT[calendarViewDate.getMonth()]} de {calendarViewDate.getFullYear()}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setCalendarViewDate(
                                  (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                                )
                              }
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                              title="Próximo mês"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Atalhos Rápidos */}
                          <div className="flex items-center justify-center gap-1.5 pb-2.5 mb-2.5 border-b border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                const d = new Date()
                                d.setDate(d.getDate() - 7)
                                setSelectedRefDate(d)
                                setCalendarViewDate(d)
                                setIsCalendarOpen(false)
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            >
                              Semana Passada
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const d = new Date()
                                setSelectedRefDate(d)
                                setCalendarViewDate(d)
                                setIsCalendarOpen(false)
                              }}
                              className="px-2 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer"
                            >
                              Esta Semana
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const d = new Date()
                                d.setDate(d.getDate() + 7)
                                setSelectedRefDate(d)
                                setCalendarViewDate(d)
                                setIsCalendarOpen(false)
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            >
                              Próxima Semana
                            </button>
                          </div>

                          {/* Cabeçalho Seg a Dom */}
                          <div className="grid grid-cols-7 gap-1 text-center mb-1">
                            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((dw, i) => (
                              <span key={i} className="text-[10px] font-bold text-slate-400 uppercase">
                                {dw}
                              </span>
                            ))}
                          </div>

                          {/* Lista de Linhas de Semanas */}
                          <div className="space-y-1">
                            {monthWeeksList.map((week, idx) => {
                              const selectedWeek = getMondayToSundayWeek(selectedRefDate)
                              const isSelected = selectedWeek.startStr === week.startStr
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setSelectedRefDate(week.start)
                                    setIsCalendarOpen(false)
                                  }}
                                  className={`w-full grid grid-cols-7 gap-1 py-1.5 px-1 rounded-xl transition-all cursor-pointer group ${
                                    isSelected
                                      ? 'bg-emerald-100 border border-emerald-300 font-bold text-emerald-950 shadow-2xs'
                                      : 'hover:bg-slate-100 text-slate-700'
                                  }`}
                                  title={`Semana de ${formatDateBR(week.startStr)} a ${formatDateBR(week.endStr)}`}
                                >
                                  {week.days.map((dayObj, dIdx) => (
                                    <span
                                      key={dIdx}
                                      className={`text-xs flex items-center justify-center h-6 ${
                                        dayObj.inCurrentMonth
                                          ? isSelected
                                            ? 'font-bold text-emerald-900'
                                            : 'text-slate-800'
                                          : 'text-slate-300'
                                      }`}
                                    >
                                      {dayObj.date.getDate()}
                                    </span>
                                  ))}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Modo MÊS */}
                      {periodMode === 'month' && (
                        <div>
                          {/* Header do Ano e Navegação */}
                          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                            <button
                              type="button"
                              onClick={() =>
                                setCalendarViewDate(
                                  (prev) => new Date(prev.getFullYear() - 1, prev.getMonth(), 1)
                                )
                              }
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                              title="Ano anterior"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold text-slate-800">
                              Ano {calendarViewDate.getFullYear()}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setCalendarViewDate(
                                  (prev) => new Date(prev.getFullYear() + 1, prev.getMonth(), 1)
                                )
                              }
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                              title="Próximo ano"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Atalhos Rápidos */}
                          <div className="flex items-center justify-center gap-1.5 pb-2.5 mb-2.5 border-b border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                const d = new Date()
                                d.setMonth(d.getMonth() - 1)
                                setSelectedRefDate(d)
                                setCalendarViewDate(d)
                                setIsCalendarOpen(false)
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            >
                              Mês Anterior
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const d = new Date()
                                setSelectedRefDate(d)
                                setCalendarViewDate(d)
                                setIsCalendarOpen(false)
                              }}
                              className="px-2 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer"
                            >
                              Mês Atual
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const d = new Date()
                                d.setMonth(d.getMonth() + 1)
                                setSelectedRefDate(d)
                                setCalendarViewDate(d)
                                setIsCalendarOpen(false)
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            >
                              Próximo Mês
                            </button>
                          </div>

                          {/* Grid dos 12 Meses */}
                          <div className="grid grid-cols-3 gap-2">
                            {MONTH_NAMES_PT.map((mName, mIdx) => {
                              const isSelected =
                                selectedRefDate.getFullYear() === calendarViewDate.getFullYear() &&
                                selectedRefDate.getMonth() === mIdx
                              const today = new Date()
                              const isCurrentMonth =
                                today.getFullYear() === calendarViewDate.getFullYear() &&
                                today.getMonth() === mIdx

                              return (
                                <button
                                  key={mIdx}
                                  type="button"
                                  onClick={() => {
                                    setSelectedRefDate(new Date(calendarViewDate.getFullYear(), mIdx, 1))
                                    setIsCalendarOpen(false)
                                  }}
                                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white font-extrabold shadow-2xs'
                                      : isCurrentMonth
                                      ? 'border border-emerald-400 text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100 font-bold'
                                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {mName.slice(0, 3)}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Modo ANO */}
                      {periodMode === 'year' && (
                        <div>
                          {/* Header e Navegação */}
                          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                            <button
                              type="button"
                              onClick={() =>
                                setCalendarViewDate(
                                  (prev) => new Date(prev.getFullYear() - 6, prev.getMonth(), 1)
                                )
                              }
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                              title="Anos anteriores"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold text-slate-800">
                              Selecione o Ano
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setCalendarViewDate(
                                  (prev) => new Date(prev.getFullYear() + 6, prev.getMonth(), 1)
                                )
                              }
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                              title="Próximos anos"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Atalhos Rápidos */}
                          <div className="flex items-center justify-center gap-1.5 pb-2.5 mb-2.5 border-b border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                const d = new Date()
                                d.setFullYear(d.getFullYear() - 1)
                                setSelectedRefDate(d)
                                setCalendarViewDate(d)
                                setIsCalendarOpen(false)
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            >
                              Ano Passado
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const d = new Date()
                                setSelectedRefDate(d)
                                setCalendarViewDate(d)
                                setIsCalendarOpen(false)
                              }}
                              className="px-2 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer"
                            >
                              Ano Atual
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const d = new Date()
                                d.setFullYear(d.getFullYear() + 1)
                                setSelectedRefDate(d)
                                setCalendarViewDate(d)
                                setIsCalendarOpen(false)
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            >
                              Próximo Ano
                            </button>
                          </div>

                          {/* Grid de Anos */}
                          <div className="grid grid-cols-3 gap-2">
                            {Array.from({ length: 6 }).map((_, i) => {
                              const yearVal = calendarViewDate.getFullYear() - 2 + i
                              const isSelected = selectedRefDate.getFullYear() === yearVal
                              const isCurrentYear = new Date().getFullYear() === yearVal

                              return (
                                <button
                                  key={yearVal}
                                  type="button"
                                  onClick={() => {
                                    setSelectedRefDate(new Date(yearVal, 0, 1))
                                    setIsCalendarOpen(false)
                                  }}
                                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white font-extrabold shadow-2xs'
                                      : isCurrentYear
                                      ? 'border border-emerald-400 text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100 font-bold'
                                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {yearVal}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Modo PERÍODO (Personalizado) */}
                      {periodMode === 'custom' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <span className="text-xs font-bold text-slate-800">Intervalo de Datas</span>
                            {(customStartDate || customEndDate) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomStartDate('')
                                  setCustomEndDate('')
                                }}
                                className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                              >
                                Limpar
                              </button>
                            )}
                          </div>

                          {/* Atalhos Rápidos */}
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const today = new Date()
                                const past = new Date(today)
                                past.setDate(today.getDate() - 6)
                                setCustomStartDate(toISODateString(past))
                                setCustomEndDate(toISODateString(today))
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer text-center"
                            >
                              Últimos 7 dias
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const today = new Date()
                                const past = new Date(today)
                                past.setDate(today.getDate() - 29)
                                setCustomStartDate(toISODateString(past))
                                setCustomEndDate(toISODateString(today))
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer text-center"
                            >
                              Últimos 30 dias
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const today = new Date()
                                const m = getMonthRange(today)
                                setCustomStartDate(m.startStr)
                                setCustomEndDate(m.endStr)
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer text-center"
                            >
                              Este Mês
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const today = new Date()
                                const y = getYearRange(today)
                                setCustomStartDate(y.startStr)
                                setCustomEndDate(y.endStr)
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer text-center"
                            >
                              Este Ano
                            </button>
                          </div>

                          {/* Inputs De / Até */}
                          <div className="space-y-2">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                Data Inicial (De):
                              </label>
                              <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                Data Final (Até):
                              </label>
                              <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsCalendarOpen(false)}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer mt-1"
                          >
                            Aplicar Intervalo
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Contador Resumido de Lançamentos */}
                <div className="hidden 2xl:flex items-center text-xs text-slate-500 font-medium px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span>
                    <strong className="text-slate-800 font-mono">{filteredTransactions.length}</strong> de{' '}
                    {transactions.length} lançamentos
                  </span>
                </div>

                {/* Alternância Tabela / Cards */}
                <div className="hidden sm:flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      viewMode === 'table'
                        ? 'bg-white text-emerald-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Visualização em Lista / Tabela"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-white text-emerald-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Visualização em Cards"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>

                {/* Botão Retrátil de Filtros Avançados */}
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isFilterDrawerOpen || activeFiltersCount > 0
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filtros</span>
                  {activeFiltersCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                      isFilterDrawerOpen ? 'rotate-180 text-emerald-700' : ''
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Linha 3: Gaveta Retrátil de Filtros Secundários */}
            {isFilterDrawerOpen && (
              <div className="pt-3 border-t border-slate-100/90 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                      Filtros Secundários & Parâmetros
                    </span>

                    {activeFiltersCount > 0 && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" /> Limpar filtros ({activeFiltersCount})
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5 text-xs">
                    {/* Critério de Data (Vencimento vs Pagamento) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Critério de Data:
                      </label>
                      <select
                        value={dateBasis}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDateBasis(e.target.value as DateFilterBasis)}
                        className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${
                          dateBasis !== 'due_date'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        <option value="due_date">Por Vencimento</option>
                        <option value="payment_date">Por Pagamento / Liquidação</option>
                      </select>
                    </div>

                    {/* Tipo */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Tipo de Operação:
                      </label>
                      <select
                        value={selectedType}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedType(e.target.value as TransactionType | 'all')}
                        className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${
                          selectedType !== 'all'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        <option value="all">Tipo: Todos</option>
                        <option value="income">Receitas (+)</option>
                        <option value="expense">Despesas (-)</option>
                      </select>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Status de Liquidação:
                      </label>
                      <select
                        value={selectedStatus}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedStatus(e.target.value as TransactionStatus | 'all')}
                        className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${
                          selectedStatus !== 'all'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        <option value="all">Status: Todos</option>
                        <option value="paid">Pago / Liquidado</option>
                        <option value="pending">Pendente</option>
                        <option value="overdue">Vencido</option>
                      </select>
                    </div>

                    {/* Recorrência */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Recorrência:
                      </label>
                      <select
                        value={selectedRecurrence}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedRecurrence(e.target.value as 'all' | 'recurring_only' | 'single_only')}
                        className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors ${
                          selectedRecurrence !== 'all'
                            ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        <option value="all">Todas as Despesas</option>
                        <option value="recurring_only">
                          🔁 Apenas Recorrentes ({transactions.filter((t) => t.recurring_expense_id).length})
                        </option>
                        <option value="single_only">
                          📄 Apenas Avulsos ({transactions.filter((t) => !t.recurring_expense_id).length})
                        </option>
                      </select>
                    </div>

                    {/* Projeto */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Projeto Vinculado:
                      </label>
                      <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none truncate transition-colors ${
                          selectedProjectId !== 'all'
                            ? 'border-blue-300 bg-blue-50 text-blue-800'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        <option value="all">Todos os Projetos</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Categoria */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Categoria de Conta:
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none truncate transition-colors ${
                          selectedCategory !== 'all'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        <option value="all">Todas as Categorias</option>
                        {allCategoryOptions.map((catName) => (
                          <option key={catName} value={catName}>
                            {catName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Transactions View: Cards ou Tabela */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <CircleDollarSign className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <h3 className="text-sm font-bold text-slate-700">
                  Nenhum lançamento encontrado para {periodLabelInfo.text}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Não há lançamentos registrados neste intervalo de datas que correspondam aos filtros ativos.
                </p>

                <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">

                  {activeFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Limpar Filtros ({activeFiltersCount})
                    </button>
                  )}
                  {canCreateEdit && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenNewTransaction('income')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                      >
                        + Nova Receita
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenNewTransaction('expense')}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
                      >
                        + Nova Despesa
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              /* ========================================================================= */
              /* MODO EM CARDS (INSPIRADO NA PÁGINA DE PROJETOS) */
              /* ========================================================================= */
              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {filteredTransactions.map((tx) => {
                    const isIncome = tx.type === 'income'
                    const isPaid = tx.status === 'paid'
                    const catDef = FINANCIAL_CATEGORIES.find(
                      (c) => c.id === tx.category || c.label === tx.category
                    )

                    return (
                      <div
                        key={tx.id}
                        className="p-4.5 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3.5 group relative"
                      >
                        <div className="space-y-2.5">
                          {/* Topo do Card: Status Toggle + Categoria + Ações */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {canCreateEdit ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(tx)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                                    isPaid
                                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                      : tx.status === 'overdue'
                                      ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                                      : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                  }`}
                                  title="Clique para alternar entre Pago e Pendente"
                                >
                                  {isPaid ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Pago</span>
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                                      <span>{tx.status === 'overdue' ? 'Vencido' : 'Pendente'}</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs ${
                                    isPaid
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {isPaid ? 'Pago' : 'Pendente'}
                                </span>
                              )}

                              {tx.recurring_expense_id && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                                  <Repeat className="w-3 h-3 text-indigo-600" /> Recorrente
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 max-w-[120px] truncate">
                                {catDef?.label || tx.category}
                              </span>
                              {canCreateEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditTransaction(tx)}
                                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="Editar Lançamento"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Título & Descrição */}
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                              {tx.title}
                            </h4>
                            {tx.description && tx.description !== tx.title && (
                              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                {tx.description}
                              </p>
                            )}
                          </div>

                          {/* Projeto & Parceiro */}
                          <div className="pt-2 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                            {tx.projects ? (
                              <div className="flex items-center gap-1.5 truncate">
                                <FolderGit2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <Link
                                  href={`/app/projetos/${tx.projects.id}/financeiro`}
                                  className="font-bold text-blue-600 hover:underline truncate"
                                >
                                  {tx.projects.title}
                                </Link>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <Briefcase className="w-3.5 h-3.5 shrink-0" />
                                <span>Geral do Escritório</span>
                              </div>
                            )}

                            {tx.companies && (
                              <div className="flex items-center gap-1.5 text-slate-600 truncate">
                                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">Parceiro: {tx.companies.name}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Rodapé do Card: Datas, Forma de Pagamento e Valor */}
                        <div className="pt-2.5 border-t border-slate-100 flex items-end justify-between gap-2">
                          <div className="text-[11px] text-slate-500 space-y-0.5">
                            <span className="block font-medium">
                              Venc: <strong className="text-slate-700">{formatDateBR(tx.due_date)}</strong>
                            </span>
                            {isPaid && tx.payment_date && (
                              <span className="block text-emerald-600 font-medium">
                                Pago em: {formatDateBR(tx.payment_date)}
                              </span>
                            )}
                            {tx.payment_method && (
                              <span className="text-slate-400 block text-[10px]">
                                {tx.payment_method}
                              </span>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`text-base font-mono font-extrabold block ${
                                isIncome ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {isIncome ? '+' : '-'} {formatBRL(tx.amount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* ========================================================================= */
              /* MODO EM TABELA (PADRÃO REESTRUTURADO) */
              /* ========================================================================= */
              <>
                <div className="hidden xl:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-xs">
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Descrição / Categoria</th>
                        <th className="py-3.5 px-4">Projeto / Parceiro</th>
                        <th className="py-3.5 px-4">Vencimento</th>
                        <th className="py-3.5 px-4">Forma</th>
                        <th className="py-3.5 px-4 text-right">Valor</th>
                        <th className="py-3.5 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTransactions.map((tx) => {
                        const isIncome = tx.type === 'income'
                        const isPaid = tx.status === 'paid'
                        const catDef = FINANCIAL_CATEGORIES.find(
                          (c) => c.id === tx.category || c.label === tx.category
                        )

                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors group">
                            {/* Status Toggle */}
                            <td className="py-4 px-4 whitespace-nowrap">
                              {canCreateEdit ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(tx)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                                    isPaid
                                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                      : tx.status === 'overdue'
                                      ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                                      : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                  }`}
                                  title="Clique para alternar entre Pago e Pendente"
                                >
                                  {isPaid ? (
                                    <>
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                      <span>Pago</span>
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="w-4 h-4 text-amber-600" />
                                      <span>{tx.status === 'overdue' ? 'Vencido' : 'Pendente'}</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-xs cursor-default ${
                                    isPaid
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : tx.status === 'overdue'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {isPaid ? 'Pago' : 'Pendente'}
                                </span>
                              )}
                            </td>

                            {/* Título & Categoria */}
                            <td className="py-4 px-4 max-w-xs">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-800 truncate group-hover:text-blue-600">
                                  {tx.title}
                                </span>
                                {tx.recurring_expense_id && (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shrink-0 shadow-2xs"
                                    title="Lançamento gerado automaticamente por regra recorrente"
                                  >
                                    <Repeat className="w-3.5 h-3.5 text-indigo-600" /> Recorrente
                                  </span>
                                )}
                              </div>
                              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-600">
                                {catDef?.label || tx.category}
                              </span>
                            </td>

                            {/* Projeto & Parceiro */}
                            <td className="py-4 px-4 max-w-xs">
                              {tx.projects ? (
                                <Link
                                  href={`/app/projetos/${tx.projects.id}/financeiro`}
                                  className="font-bold text-blue-600 hover:underline block truncate"
                                >
                                  {tx.projects.title}
                                </Link>
                              ) : (
                                <span className="text-slate-400 font-medium text-xs">
                                  Geral do Escritório
                                </span>
                              )}

                              {tx.companies && (
                                <span className="text-xs text-slate-500 block truncate mt-0.5">
                                  Parceiro: {tx.companies.name}
                                </span>
                              )}
                            </td>

                            {/* Datas de Vencimento e Pagamento */}
                            <td className="py-4 px-4 whitespace-nowrap">
                              <span className="font-bold text-slate-700 block">
                                {formatDateBR(tx.due_date)}
                              </span>
                              {isPaid && tx.payment_date && (
                                <span className="text-xs text-emerald-600 font-medium block">
                                  Pago em: {formatDateBR(tx.payment_date)}
                                </span>
                              )}
                            </td>

                            {/* Forma de Pagamento */}
                            <td className="py-4 px-4 whitespace-nowrap">
                              <span className="text-xs font-semibold text-slate-600">
                                {tx.payment_method || '-'}
                              </span>
                            </td>

                            {/* Valor */}
                            <td className="py-4 px-4 whitespace-nowrap text-right">
                              <span
                                className={`text-base font-mono font-extrabold ${
                                  isIncome ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {isIncome ? '+' : '-'} {formatBRL(tx.amount)}
                              </span>
                            </td>

                            {/* Ações */}
                            <td className="py-4 px-4 whitespace-nowrap text-right">
                              {canCreateEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditTransaction(tx)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                  title="Editar Lançamento"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile / Tablet Responsive Cards (< 1280px) */}
                <div className="block xl:hidden divide-y divide-slate-100">
                  {filteredTransactions.map((tx) => {
                    const isIncome = tx.type === 'income'
                    const isPaid = tx.status === 'paid'
                    const catDef = FINANCIAL_CATEGORIES.find(
                      (c) => c.id === tx.category || c.label === tx.category
                    )

                    return (
                      <div
                        key={tx.id}
                        className="p-4 space-y-3 hover:bg-slate-50/60 transition-colors"
                      >
                        {/* Topo do Card: Status + Categoria + Valor */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center flex-wrap gap-1.5">
                              {canCreateEdit ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(tx)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                                    isPaid
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : tx.status === 'overdue'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {isPaid ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Pago</span>
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                                      <span>{tx.status === 'overdue' ? 'Atrasado' : 'Pendente'}</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs ${
                                    isPaid
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {isPaid ? 'Pago' : 'Pendente'}
                                </span>
                              )}

                              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600">
                                {catDef?.label || tx.category}
                              </span>

                              {tx.recurring_expense_id && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  <Repeat className="w-3 h-3 text-indigo-600" /> Recorrente
                                </span>
                              )}
                            </div>

                            <p className="font-bold text-sm text-slate-800 leading-snug pt-0.5">
                              {tx.title}
                            </p>
                          </div>

                          {/* Valor em destaque */}
                          <div className="text-right shrink-0">
                            <span
                              className={`text-base font-mono font-extrabold block ${
                                isIncome ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {isIncome ? '+' : '-'} {formatBRL(tx.amount)}
                            </span>
                            {canCreateEdit && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditTransaction(tx)}
                                className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" /> Editar
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Metadados / Projeto / Vencimento */}
                        <div className="pt-2 border-t border-slate-100/80 flex flex-wrap items-center justify-between gap-y-1.5 text-xs text-slate-500">
                          <div className="flex items-center gap-2">
                            {tx.projects ? (
                              <Link
                                href={`/app/projetos/${tx.projects.id}/financeiro`}
                                className="font-semibold text-blue-600 hover:underline"
                              >
                                {tx.projects.title}
                              </Link>
                            ) : (
                              <span>Geral do Escritório</span>
                            )}
                            {tx.companies && (
                              <>
                                <span>•</span>
                                <span className="text-slate-600 font-medium">Parceiro: {tx.companies.name}</span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-3 font-mono text-slate-600 text-[11px]">
                            <span>Venc: <strong>{formatDateBR(tx.due_date)}</strong></span>
                            {tx.payment_method && (
                              <span className="text-slate-400">({tx.payment_method})</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEÇÃO 3: LUCRATIVIDADE POR PROJETO */}
      {/* ========================================================================= */}
      {currentSubPage === 'lucratividade' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-6 text-white shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
                  Inteligência de Projetos
                </span>
                <h2 className="text-xl font-extrabold mt-0.5">
                  Lucro Realizado e Margem Líquida por Obra
                </h2>
                <p className="text-xs text-blue-100/80 mt-1 max-w-xl">
                  Calculamos o faturamento real (Honorários + Comissões RT recebidas) deduzindo todos os gastos
                  específicos como visitas, brindes, aluguel de sala de reunião e plotagens.
                </p>
              </div>

              <div className="flex items-center gap-6 bg-white/10 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white/10 shrink-0">
                <div>
                  <span className="text-[10px] text-blue-200 font-bold block">Faturamento Realizado</span>
                  <span className="text-lg font-mono font-extrabold">
                    {formatBRL(profitability.reduce((acc, p) => acc + p.totalRevenue, 0))}
                  </span>
                </div>
                {profitability.some((p) => (p.pendingCommissions || 0) > 0) && (
                  <div className="border-l border-white/20 pl-5">
                    <span className="text-[10px] text-amber-200 font-bold block">RT a Receber</span>
                    <span className="text-sm font-mono font-bold text-amber-200">
                      {formatBRL(profitability.reduce((acc, p) => acc + (p.pendingCommissions || 0), 0))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profitability Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Projeto / Cliente</th>
                    <th className="py-3.5 px-4 text-right">Honorários</th>
                    <th className="py-3.5 px-4 text-right">Comissões RT</th>
                    <th className="py-3.5 px-4 text-right">Faturamento Total</th>
                    <th className="py-3.5 px-4 text-right">Custos Diretos</th>
                    <th className="py-3.5 px-4 text-right">Lucro Líquido</th>
                    <th className="py-3.5 px-4 text-center">Margem %</th>
                    <th className="py-3.5 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profitability.map((p) => (
                    <tr key={p.projectId} className="hover:bg-slate-50/70 transition-colors">
                      {/* Project & Client */}
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/app/projetos/${p.projectId}/financeiro`}
                          className="font-bold text-slate-900 hover:text-blue-600 block"
                        >
                          {p.projectTitle}
                        </Link>
                        <span className="text-[11px] text-slate-500 block">{p.clientName}</span>
                      </td>

                      {/* Direct Contract Income */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-700">
                        {formatBRL(p.directContractIncome)}
                      </td>

                      {/* Commissions RT */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-blue-600">
                        <div>{formatBRL(p.commissionsIncome)}</div>
                        {p.pendingCommissions !== undefined && p.pendingCommissions > 0 ? (
                          <span className="text-[10px] text-amber-600 font-normal block mt-0.5">
                            + {formatBRL(p.pendingCommissions)} a receber
                          </span>
                        ) : null}
                      </td>

                      {/* Total Revenue */}
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-600">
                        <div>{formatBRL(p.totalRevenue)}</div>
                        {p.pendingRevenue > 0 ? (
                          <span className="text-[10px] text-slate-400 font-normal block mt-0.5">
                            + {formatBRL(p.pendingRevenue)} prev.
                          </span>
                        ) : null}
                      </td>

                      {/* Expenses Total */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-rose-600">
                        {formatBRL(p.expensesTotal)}
                      </td>

                      {/* Net Profit */}
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold">
                        <span
                          className={`px-2 py-1 rounded-lg ${p.netProfit >= 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                            }`}
                        >
                          {formatBRL(p.netProfit)}
                        </span>
                      </td>

                      {/* Margem % */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block font-bold text-[11px] px-2 py-0.5 rounded-full ${p.profitMarginPercent >= 50
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.profitMarginPercent > 0
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                            }`}
                        >
                          {p.profitMarginPercent.toFixed(1)}%
                        </span>
                      </td>

                      {/* Ação */}
                      <td className="py-3.5 px-4 text-center">
                        <Link
                          href={`/app/projetos/${p.projectId}/financeiro`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors"
                        >
                          Detalhes <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Responsive Cards (< 1280px) */}
            <div className="block xl:hidden divide-y divide-slate-100">
              {profitability.map((p) => (
                <div key={p.projectId} className="p-4.5 space-y-3.5 hover:bg-slate-50/50 transition-colors">
                  {/* Topo: Título + Margem e Lucro */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/app/projetos/${p.projectId}/financeiro`}
                        className="font-bold text-sm text-slate-900 hover:text-blue-600 transition-colors block truncate"
                      >
                        {p.projectTitle}
                      </Link>
                      <span className="text-xs text-slate-500 block truncate mt-0.5">
                        {p.clientName}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded-lg ${
                          p.netProfit >= 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}
                      >
                        {formatBRL(p.netProfit)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                          p.profitMarginPercent >= 50
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.profitMarginPercent > 0
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        Margem: {p.profitMarginPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Grid de Métricas */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Honorários</span>
                      <span className="font-mono font-semibold text-slate-700 mt-0.5 block">
                        {formatBRL(p.directContractIncome)}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-blue-50/50 border border-blue-100/60">
                      <span className="text-[10px] uppercase font-bold text-blue-400 block">Comissões RT</span>
                      <span className="font-mono font-semibold text-blue-700 mt-0.5 block">
                        {formatBRL(p.commissionsIncome)}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-emerald-50/50 border border-emerald-100/60">
                      <span className="text-[10px] uppercase font-bold text-emerald-500 block">Faturamento</span>
                      <span className="font-mono font-extrabold text-emerald-700 mt-0.5 block">
                        {formatBRL(p.totalRevenue)}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-rose-50/50 border border-rose-100/60">
                      <span className="text-[10px] uppercase font-bold text-rose-400 block">Custos</span>
                      <span className="font-mono font-semibold text-rose-700 mt-0.5 block">
                        {formatBRL(p.expensesTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Rodapé CTA */}
                  <div className="pt-2 flex justify-end">
                    <Link
                      href={`/app/projetos/${p.projectId}/financeiro`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Ver detalhes do projeto <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEÇÃO 4: PASSADO, PRESENTE E FUTURO (PROJEÇÃO DE FLUXO DE CAIXA) */}
      {/* ========================================================================= */}
      {currentSubPage === 'projecao' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Linha do Tempo: Histórico e Projeção Futura
            </h2>
            <p className="text-xs text-slate-500">
              Acompanhe o fechamento real dos meses passados, a posição do mês corrente e a projeção
              automática dos próximos meses considerando parcelas agendadas, receitas recorrentes e custos fixos estruturais.
            </p>
          </div>

          {/* Timeline Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {projection.map((item) => (
              <div
                key={item.monthKey}
                className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${item.isCurrent
                  ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-500/20 shadow-md'
                  : item.isPast
                    ? 'bg-white border-slate-200/80 opacity-90'
                    : 'bg-white border-slate-200/80 shadow-xs'
                  }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-slate-900">{item.monthLabel}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.isCurrent
                        ? 'bg-blue-600 text-white'
                        : item.isPast
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-amber-100 text-amber-800'
                        }`}
                    >
                      {item.isCurrent ? '📍 Mês Atual' : item.isPast ? 'Histórico Fechado' : '🔮 Projeção'}
                    </span>
                  </div>

                  {/* Numbers Breakdown */}
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Receitas Previstas:</span>
                      <span className="font-bold text-emerald-600 font-mono">
                        {formatBRL(item.projectedIncome)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span>Despesas Estimadas:</span>
                      <span className="font-bold text-rose-600 font-mono">
                        {formatBRL(item.projectedExpense)}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-bold">
                      <span className="text-slate-700">Resultado do Mês:</span>
                      <span
                        className={`font-mono ${item.projectedBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                      >
                        {formatBRL(item.projectedBalance)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Accumulated Balance */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Saldo Acumulado:</span>
                  <span
                    className={`font-mono font-extrabold ${item.accumulatedBalance >= 0 ? 'text-slate-900' : 'text-rose-600'
                      }`}
                  >
                    {formatBRL(item.accumulatedBalance)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Lançamentos */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSuccess={handleTxSuccess}
        organizationId={organizationId}
        projects={projects}
        companies={companies}
        initialTransaction={selectedTx}
        defaultType={modalDefaultType}
      />
    </div>
  )
}

