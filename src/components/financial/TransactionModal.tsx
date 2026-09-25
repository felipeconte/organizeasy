'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  X,
  Plus,
  Loader2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Building2,
  FolderGit2,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Trash2,
  Repeat,
  CalendarDays,
  Check
} from 'lucide-react'
import {
  FinancialTransaction,
  FINANCIAL_CATEGORIES,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
  RecurringFrequency,
  RecurrenceUnit,
  RecurrenceEndCondition,
  RecurrenceEditScope
} from '@/types/financial'
import {
  createFinancialTransactionAction,
  updateFinancialTransactionAction,
  deleteFinancialTransactionAction
} from '@/lib/actions/financial'
import { generateRecurrenceDates } from '@/lib/financial-recurrence'
import { usePermissions } from '@/contexts/PermissionsContext'
import FinancialCategorySelect from '@/components/financial/FinancialCategorySelect'

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

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (tx: FinancialTransaction, isDeleted?: boolean, deleteScope?: RecurrenceEditScope) => void
  organizationId: string
  projects?: ProjectOption[]
  companies?: CompanyOption[]
  initialTransaction?: FinancialTransaction | null
  defaultProjectId?: string | null
  defaultType?: TransactionType
}

/**
 * Formata valores monetários em BRL (R$ 0,00) dinamicamente conforme a digitação.
 */
function formatMoneyValue(value: string | number | null | undefined): { display: string; raw: number } {
  if (value === null || value === undefined || value === '') {
    return { display: '', raw: 0 }
  }

  // Se for número direto (ao carregar do banco)
  if (typeof value === 'number') {
    if (value <= 0 || isNaN(value)) return { display: '', raw: 0 }
    const display = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
    return { display, raw: value }
  }

  // Extrai apenas dígitos da digitação
  const digits = String(value).replace(/\D/g, '')
  if (!digits) {
    return { display: '', raw: 0 }
  }

  const raw = parseInt(digits, 10) / 100
  const display = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(raw)

  return { display, raw }
}

export default function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  organizationId,
  projects = [],
  companies = [],
  initialTransaction = null,
  defaultProjectId = null,
  defaultType = 'income'
}: TransactionModalProps) {
  const isEditing = Boolean(initialTransaction)
  const { can } = usePermissions()
  const canDelete = can('financial_delete')

  const [type, setType] = useState<TransactionType>(defaultType)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [projectId, setProjectId] = useState<string>(defaultProjectId || '')
  const [companyId, setCompanyId] = useState<string>('')
  const [dueDate, setDueDate] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [status, setStatus] = useState<TransactionStatus>('pending')
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX')
  const [receiptUrl, setReceiptUrl] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringInterval, setRecurringInterval] = useState<number | ''>(1)
  const [recurringUnit, setRecurringUnit] = useState<RecurrenceUnit>('month')
  const [recurringWeekDays, setRecurringWeekDays] = useState<number[]>([])
  const [recurringEndCondition, setRecurringEndCondition] = useState<RecurrenceEndCondition>('never')
  const [recurringEndDate, setRecurringEndDate] = useState<string>('')
  const [recurringOccurrences, setRecurringOccurrences] = useState<number | ''>(12)
  const [editScope, setEditScope] = useState<RecurrenceEditScope>('single')
  const [deleteConfirmScope, setDeleteConfirmScope] = useState<RecurrenceEditScope | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const DAYS_OF_WEEK = [
    { value: 0, label: 'D', full: 'Domingo', short: 'Dom' },
    { value: 1, label: 'S', full: 'Segunda-feira', short: 'Seg' },
    { value: 2, label: 'T', full: 'Terça-feira', short: 'Ter' },
    { value: 3, label: 'Q', full: 'Quarta-feira', short: 'Qua' },
    { value: 4, label: 'Q', full: 'Quinta-feira', short: 'Qui' },
    { value: 5, label: 'S', full: 'Sexta-feira', short: 'Sex' },
    { value: 6, label: 'S', full: 'Sábado', short: 'Sáb' }
  ]

  const formatDateBR = (dateStr?: string | null) => {
    if (!dateStr) return '-'
    const parts = dateStr.split('T')[0].split('-')
    if (parts.length !== 3) return dateStr
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }

  // Sincroniza estado quando modal abre
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('')
      if (initialTransaction) {
        setType(initialTransaction.type)
        setTitle(initialTransaction.title || '')
        setDescription(initialTransaction.description || '')
        setAmount(formatMoneyValue(initialTransaction.amount).display)
        setCategory(initialTransaction.category || '')
        setProjectId(initialTransaction.project_id || '')
        setCompanyId(initialTransaction.company_id || '')
        setDueDate(initialTransaction.due_date || '')
        setPaymentDate(initialTransaction.payment_date || '')
        setStatus(initialTransaction.status || 'pending')
        setPaymentMethod(initialTransaction.payment_method || 'PIX')
        setReceiptUrl(initialTransaction.receipt_url || '')
        setIsRecurring(Boolean(initialTransaction.recurring_expense_id))
        setEditScope('single')
        setDeleteConfirmScope(null)
      } else {
        setType(defaultType)
        setTitle('')
        setDescription('')
        setAmount('')
        const defaultCats = FINANCIAL_CATEGORIES.filter((c) => c.type === defaultType)
        setCategory(defaultCats[0]?.label || defaultCats[0]?.id || '')
        setProjectId(defaultProjectId || '')
        setCompanyId('')
        const today = new Date().toISOString().split('T')[0]
        setDueDate(today)
        setPaymentDate(today)
        setStatus('pending')
        setPaymentMethod('PIX')
        setReceiptUrl('')
        setIsRecurring(false)
        setRecurringInterval(1)
        setRecurringUnit('month')
        const dayOfWeek = new Date(today + 'T12:00:00').getDay()
        setRecurringWeekDays([dayOfWeek])
        setRecurringEndCondition('never')
        setRecurringEndDate('')
        setRecurringOccurrences(12)
        setEditScope('single')
        setDeleteConfirmScope(null)
      }
    }
  }, [isOpen, initialTransaction, defaultProjectId, defaultType])

  // Ajusta categoria padrão quando o tipo (Receita/Despesa) muda
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType)
    const available = FINANCIAL_CATEGORIES.filter((c) => c.type === newType)
    if (!available.some((c) => c.id === category || c.label.toLowerCase() === category.toLowerCase())) {
      setCategory(available[0]?.label || available[0]?.id || '')
    }
  }

  const handleDueDateChange = (newDate: string) => {
    setDueDate(newDate)
    if (!newDate) return
    const d = new Date(newDate + 'T12:00:00')
    if (!isNaN(d.getTime())) {
      const day = d.getDay()
      setRecurringWeekDays((prev) => (prev.length === 0 ? [day] : prev))
    }
  }

  const toggleWeekDay = (dayVal: number) => {
    setRecurringWeekDays((prev) => {
      if (prev.includes(dayVal)) {
        if (prev.length === 1) return prev
        return prev.filter((d) => d !== dayVal).sort((a, b) => a - b)
      }
      return [...prev, dayVal].sort((a, b) => a - b)
    })
  }

  const recurrencePreview = useMemo(() => {
    if (!isRecurring || !dueDate) return null

    const effectiveWeekDays =
      recurringWeekDays.length > 0
        ? recurringWeekDays
        : [new Date(dueDate + 'T12:00:00').getDay()]

    const safeInterval = Math.min(99, Math.max(1, Number(recurringInterval) || 1))
    const safeOccurrences = Math.max(1, Number(recurringOccurrences) || 1)

    const dates = generateRecurrenceDates({
      startDate: dueDate,
      interval: safeInterval,
      unit: recurringUnit,
      weekDays: effectiveWeekDays,
      endCondition: recurringEndCondition,
      endDate: recurringEndDate,
      occurrences: safeOccurrences,
      maxNeverOccurrences: 12
    })

    const unitName =
      safeInterval === 1
        ? recurringUnit === 'day'
          ? 'dia'
          : recurringUnit === 'week'
            ? 'semana'
            : recurringUnit === 'month'
              ? 'mês'
              : 'ano'
        : recurringUnit === 'day'
          ? 'dias'
          : recurringUnit === 'week'
            ? 'semanas'
            : recurringUnit === 'month'
              ? 'meses'
              : 'anos'

    const daysText =
      recurringUnit === 'week' && effectiveWeekDays.length > 0
        ? ` (${effectiveWeekDays.map((d) => DAYS_OF_WEEK.find((item) => item.value === d)?.short).join(', ')})`
        : ''

    let terminationText = ''
    if (recurringEndCondition === 'never') {
      terminationText = 'sem data limite (12 lançamentos já gerados de início)'
    } else if (recurringEndCondition === 'date') {
      terminationText = `termina em ${formatDateBR(recurringEndDate || dueDate)} (${dates.length} ocorrência${dates.length === 1 ? '' : 's'})`
    } else {
      const lastDate = dates[dates.length - 1]
      terminationText = `termina após ${safeOccurrences} ocorrência${safeOccurrences === 1 ? '' : 's'}${lastDate ? ` (última em ${formatDateBR(lastDate)})` : ''}`
    }

    return {
      summary: `Repetir a cada ${safeInterval} ${unitName}${daysText} • ${terminationText}`,
      count: dates.length,
      dates
    }
  }, [isRecurring, dueDate, recurringInterval, recurringUnit, recurringWeekDays, recurringEndCondition, recurringEndDate, recurringOccurrences])

  if (!isOpen) return null

  const availableCategories = FINANCIAL_CATEGORIES.filter((c) => c.type === type)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!title.trim()) {
      setErrorMsg('Informe a descrição / título do lançamento.')
      return
    }

    const cleanDigits = amount.replace(/\D/g, '')
    const numAmount = cleanDigits ? parseInt(cleanDigits, 10) / 100 : 0
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Informe um valor válido e maior que zero.')
      return
    }

    if (!dueDate) {
      setErrorMsg('Informe a data de vencimento / previsão.')
      return
    }

    if (isRecurring && recurringEndCondition === 'date') {
      if (!recurringEndDate) {
        setErrorMsg('Informe a data de encerramento da repetição.')
        return
      }
      if (recurringEndDate < dueDate) {
        setErrorMsg('A data de encerramento não pode ser anterior à data do lançamento.')
        return
      }
    }

    setIsLoading(true)

    try {
      if (isEditing && initialTransaction) {
        const res = await updateFinancialTransactionAction({
          id: initialTransaction.id,
          organizationId,
          type,
          title: title.trim(),
          description: description.trim() || null,
          amount: numAmount,
          category,
          projectId: projectId || null,
          companyId: companyId || null,
          dueDate,
          paymentDate: status === 'paid' ? (paymentDate || dueDate) : null,
          status,
          paymentMethod,
          receiptUrl: receiptUrl.trim() || null,
          editScope: initialTransaction.recurring_expense_id ? editScope : 'single'
        })

        if (!res.success || !res.transaction) {
          setErrorMsg(res.error || 'Falha ao atualizar lançamento.')
          setIsLoading(false)
          return
        }

        onSuccess(res.transaction)
        onClose()
      } else {
        const res = await createFinancialTransactionAction({
          organizationId,
          type,
          title: title.trim(),
          description: description.trim() || null,
          amount: numAmount,
          category,
          projectId: projectId || null,
          companyId: companyId || null,
          dueDate,
          paymentDate: status === 'paid' ? (paymentDate || dueDate) : null,
          status,
          paymentMethod,
          receiptUrl: receiptUrl.trim() || null,
          isRecurring,
          recurringInterval: Math.min(99, Math.max(1, Number(recurringInterval) || 1)),
          recurringUnit,
          recurringWeekDays: recurringWeekDays.length > 0 ? recurringWeekDays : [new Date(dueDate + 'T12:00:00').getDay()],
          recurringEndCondition,
          recurringEndDate: recurringEndCondition === 'date' ? recurringEndDate : null,
          recurringOccurrences: recurringEndCondition === 'occurrences' ? Math.max(1, Number(recurringOccurrences) || 1) : null
        })

        if (!res.success || !res.transaction) {
          setErrorMsg(res.error || 'Falha ao criar lançamento.')
          setIsLoading(false)
          return
        }

        onSuccess(res.transaction)
        onClose()
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado.')
    } finally {
      setIsLoading(false)
    }
  }

  const executeDelete = async (scope: RecurrenceEditScope) => {
    if (!initialTransaction) return

    setIsDeleting(true)
    setErrorMsg('')

    try {
      const res = await deleteFinancialTransactionAction({
        id: initialTransaction.id,
        organizationId,
        deleteScope: scope
      })

      if (!res.success) {
        setErrorMsg(res.error || 'Falha ao excluir lançamento.')
        setIsDeleting(false)
        return
      }

      setDeleteConfirmScope(null)
      onSuccess(initialTransaction, true, scope)
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao excluir lançamento.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs antialiased animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] my-auto">
        {/* Header */}
        <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-xs ${type === 'income' ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-600 shadow-rose-500/20'
                }`}
            >
              {type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEditing ? 'Editar Lançamento' : type === 'income' ? 'Nova Entrada (Receita)' : 'Nova Saída (Despesa)'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEditing ? 'Atualize as informações do registro financeiro.' : 'Preencha os dados do fluxo de caixa.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 text-sm">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}


          {/* Type Selector (Receita vs Despesa) */}
          <div className="flex p-1.5 bg-slate-100/90 rounded-2xl">
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${type === 'income'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <TrendingUp className="w-4 h-4" /> Entrada / Receita
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${type === 'expense'
                  ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <TrendingDown className="w-4 h-4" /> Saída / Despesa
            </button>
          </div>

          {/* Title & Amount Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block min-h-[20px] flex items-center">
                Descrição do lançamento *
              </label>
              <input
                type="text"
                required
                placeholder={type === 'income' ? 'Ex: 1ª Parcela de Honorários' : 'Ex: Visita à Obra - Combustível & Pedágio'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-slate-800 font-medium text-sm transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block min-h-[20px] flex items-center">
                Valor (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm select-none">
                  R$
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(formatMoneyValue(e.target.value).display)}
                  className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-slate-900 font-bold font-mono text-base tracking-tight transition-all"
                />
              </div>
            </div>
          </div>

          {/* Category & Project Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block min-h-[20px] flex items-center justify-between">
                <span>Categoria *</span>
              </label>
              <FinancialCategorySelect
                value={category}
                onChange={setCategory}
                type={type}
                organizationId={organizationId}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block min-h-[20px] flex items-center justify-between">
                <span>Vínculo com Projeto</span>
                <span className="text-[11px] text-slate-400 font-normal normal-case">(Opcional)</span>
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-slate-800 font-medium text-sm cursor-pointer transition-all"
              >
                <option value="">Nenhum (Despesa/Receita Geral do Escritório)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} {p.client_name ? `• ${p.client_name}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Company / Supplier & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block min-h-[20px] flex items-center justify-between">
                <span>Fornecedor / Empresa / Parceiro</span>
                <span className="text-[11px] text-slate-400 font-normal normal-case">(Opcional)</span>
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-slate-800 font-medium text-sm cursor-pointer transition-all"
              >
                <option value="">Não vinculado</option>
                {companies.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name} {comp.trade_name ? `(${comp.trade_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block min-h-[20px] flex items-center justify-between">
                <span>Forma de Pagamento</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-slate-800 font-medium text-sm cursor-pointer transition-all"
              >
                <option value="PIX">PIX</option>
                <option value="Boleto">Boleto Bancário</option>
                <option value="Cartao_Credito">Cartão de Crédito</option>
                <option value="Cartao_Debito">Cartão de Débito</option>
                <option value="TED">Transferência (TED/DOC)</option>
                <option value="Debito_Automatico">Débito Automático</option>
                <option value="Dinheiro">Dinheiro em Espécie</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>

          {/* Dates & Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block min-h-[20px] flex items-center">
                Vencimento / Previsão *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => handleDueDateChange(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-slate-800 font-medium text-sm cursor-pointer transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block min-h-[20px] flex items-center">
                Status do Lançamento
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TransactionStatus)}
                className={`w-full h-11 px-3.5 rounded-xl border font-bold text-sm cursor-pointer transition-colors ${status === 'paid'
                    ? 'border-emerald-300 bg-emerald-50/70 text-emerald-800'
                    : status === 'overdue'
                      ? 'border-rose-300 bg-rose-50/70 text-rose-800'
                      : 'border-amber-300 bg-amber-50/70 text-amber-800'
                  }`}
              >
                <option value="pending">
                  {type === 'income' ? '⏳ Pendente (A Receber)' : '⏳ Pendente (A Pagar)'}
                </option>
                <option value="paid">
                  {type === 'income' ? '✅ Recebido' : '✅ Pago'}
                </option>
                <option value="overdue">🚨 Vencido / Atrasado</option>
                <option value="cancelled">🚫 Cancelado</option>
              </select>
            </div>

            {status === 'paid' ? (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block min-h-[20px] flex items-center">
                  Data de Liquidação
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 font-medium text-sm cursor-pointer transition-all"
                />
              </div>
            ) : (
              <div className="space-y-1.5 opacity-60">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block min-h-[20px] flex items-center">
                  Data de Liquidação
                </label>
                <input
                  type="text"
                  disabled
                  value={type === 'income' ? 'Disponível quando Recebido' : 'Disponível quando Pago'}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-400 font-medium text-sm cursor-not-allowed"
                />
              </div>
            )}
          </div>

          {/* Recurring Option (When creating) */}
          {!isEditing && (
            <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-100/90 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Repeat className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block text-sm">
                      Tornar este lançamento recorrente?
                    </span>
                    <span className="text-xs text-slate-500">
                      Gera automaticamente os lançamentos futuros no extrato e relatórios.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsRecurring(!isRecurring)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isRecurring ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${isRecurring ? 'translate-x-5' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>

              {isRecurring && (
                <div className="pt-3 border-t border-indigo-100/90 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                  {/* Repetir a cada */}
                  <div>
                    <label className="text-xs font-bold text-indigo-950 uppercase tracking-wider block mb-1.5">
                      Repetir a cada:
                    </label>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={recurringInterval}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === '') {
                            setRecurringInterval('')
                            return
                          }
                          const parsed = parseInt(val, 10)
                          if (!isNaN(parsed)) {
                            setRecurringInterval(Math.min(99, Math.max(0, parsed)))
                          }
                        }}
                        onBlur={() => {
                          if (recurringInterval === '' || Number(recurringInterval) < 1) {
                            setRecurringInterval(1)
                          }
                        }}
                        className="w-20 h-11 px-3 rounded-xl border border-indigo-200 text-center font-bold text-sm text-indigo-950 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                      <select
                        value={recurringUnit}
                        onChange={(e) => {
                          const newUnit = e.target.value as RecurrenceUnit
                          setRecurringUnit(newUnit)
                          if (newUnit === 'week' && recurringWeekDays.length === 0 && dueDate) {
                            const d = new Date(dueDate + 'T12:00:00')
                            setRecurringWeekDays([d.getDay()])
                          }
                        }}
                        className="flex-1 h-11 px-3.5 rounded-xl border border-indigo-200 font-bold text-sm text-indigo-950 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition-all"
                      >
                        <option value="day">{Number(recurringInterval) <= 1 ? 'Dia' : 'Dias'}</option>
                        <option value="week">{Number(recurringInterval) <= 1 ? 'Semana' : 'Semanas'}</option>
                        <option value="month">{Number(recurringInterval) <= 1 ? 'Mês' : 'Meses'}</option>
                        <option value="year">{Number(recurringInterval) <= 1 ? 'Ano' : 'Anos'}</option>
                      </select>
                    </div>
                  </div>

                  {/* Se for semanal: Repete em (dias da semana) */}
                  {recurringUnit === 'week' && (
                    <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                      <label className="text-xs font-bold text-indigo-950 uppercase tracking-wider block">
                        Repete em:
                      </label>
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        {DAYS_OF_WEEK.map((day) => {
                          const isSelected = recurringWeekDays.includes(day.value)
                          return (
                            <button
                              key={day.value}
                              type="button"
                              onClick={() => toggleWeekDay(day.value)}
                              title={day.full}
                              className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-xs scale-105 ring-2 ring-indigo-600/30'
                                  : 'bg-white border border-indigo-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-900'
                              }`}
                            >
                              {day.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Término da repetição */}
                  <div className="space-y-2 pt-1">
                    <label className="text-xs font-bold text-indigo-950 uppercase tracking-wider block">
                      Término da repetição:
                    </label>

                    <div className="space-y-2">
                      {/* Opção 1: Nunca */}
                      <label
                        className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                          recurringEndCondition === 'never'
                            ? 'border-indigo-500 bg-white text-indigo-950 shadow-2xs font-bold ring-1 ring-indigo-500/20'
                            : 'border-indigo-200/70 bg-white/70 text-slate-700 hover:bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="endCondition"
                          value="never"
                          checked={recurringEndCondition === 'never'}
                          onChange={() => setRecurringEndCondition('never')}
                          className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-900">Nunca</span>
                          <span className="text-[11px] text-slate-500 font-normal">
                            A repetição continua sem data final até que você decida cancelar.
                          </span>
                        </div>
                      </label>

                      {/* Opção 2: Na data específica */}
                      <label
                        className={`p-3 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all ${
                          recurringEndCondition === 'date'
                            ? 'border-indigo-500 bg-white text-indigo-950 shadow-2xs ring-1 ring-indigo-500/20'
                            : 'border-indigo-200/70 bg-white/70 text-slate-700 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="endCondition"
                            value="date"
                            checked={recurringEndCondition === 'date'}
                            onChange={() => setRecurringEndCondition('date')}
                            className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-900">Em uma data específica</span>
                        </div>

                        {recurringEndCondition === 'date' && (
                          <div className="pl-6 pt-1 animate-in fade-in duration-150">
                            <input
                              type="date"
                              min={dueDate}
                              value={recurringEndDate}
                              onChange={(e) => setRecurringEndDate(e.target.value)}
                              className="w-full sm:w-64 h-10 px-3 rounded-xl border border-indigo-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>
                        )}
                      </label>

                      {/* Opção 3: Após X ocorrências */}
                      <label
                        className={`p-3 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all ${
                          recurringEndCondition === 'occurrences'
                            ? 'border-indigo-500 bg-white text-indigo-950 shadow-2xs ring-1 ring-indigo-500/20'
                            : 'border-indigo-200/70 bg-white/70 text-slate-700 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="endCondition"
                            value="occurrences"
                            checked={recurringEndCondition === 'occurrences'}
                            onChange={() => setRecurringEndCondition('occurrences')}
                            className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-900">Após um número de ocorrências</span>
                        </div>

                        {recurringEndCondition === 'occurrences' && (
                          <div className="pl-6 pt-1 flex items-center gap-2 animate-in fade-in duration-150">
                            <input
                              type="number"
                              min={1}
                              max={999}
                              value={recurringOccurrences}
                              onChange={(e) => {
                                const val = e.target.value
                                if (val === '') {
                                  setRecurringOccurrences('')
                                  return
                                }
                                const parsed = parseInt(val, 10)
                                if (!isNaN(parsed)) {
                                  setRecurringOccurrences(Math.min(999, Math.max(0, parsed)))
                                }
                              }}
                              onBlur={() => {
                                if (recurringOccurrences === '' || Number(recurringOccurrences) < 1) {
                                  setRecurringOccurrences(1)
                                }
                              }}
                              className="w-24 h-10 px-3 rounded-xl border border-indigo-200 bg-white text-center text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                            <span className="text-xs text-slate-600 font-medium">ocorrências / repetições</span>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Resumo Dinâmico em tempo real */}
                  {recurrencePreview && (
                    <div className="p-3.5 rounded-xl bg-white border border-indigo-200/80 flex items-start gap-2.5 text-xs text-indigo-900 font-medium">
                      <Repeat className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold block text-slate-900">Resumo da regra:</span>
                        <p className="text-slate-700">{recurrencePreview.summary}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Description / Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Observações / Detalhes
            </label>
            <textarea
              rows={3}
              placeholder="Ex: Referente à parcela da entrega do estudo preliminar..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-slate-800 font-medium text-sm resize-none transition-all"
            />
          </div>

          {/* Recurrence Edit Scope (When editing recurring transaction) */}
          {isEditing && initialTransaction?.recurring_expense_id && (
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                <Repeat className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Lançamento Recorrente — Ao salvar, aplicar alterações a:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <label
                  className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 transition-all ${
                    editScope === 'single'
                      ? 'border-indigo-500 bg-white text-indigo-950 shadow-2xs font-bold ring-1 ring-indigo-500/20'
                      : 'border-indigo-200/70 bg-white/70 text-slate-700 hover:bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="editScope"
                    value="single"
                    checked={editScope === 'single'}
                    onChange={() => setEditScope('single')}
                    className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Apenas este</span>
                </label>

                <label
                  className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 transition-all ${
                    editScope === 'future'
                      ? 'border-indigo-500 bg-white text-indigo-950 shadow-2xs font-bold ring-1 ring-indigo-500/20'
                      : 'border-indigo-200/70 bg-white/70 text-slate-700 hover:bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="editScope"
                    value="future"
                    checked={editScope === 'future'}
                    onChange={() => setEditScope('future')}
                    className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Este e os futuros</span>
                </label>

                <label
                  className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 transition-all ${
                    editScope === 'all'
                      ? 'border-indigo-500 bg-white text-indigo-950 shadow-2xs font-bold ring-1 ring-indigo-500/20'
                      : 'border-indigo-200/70 bg-white/70 text-slate-700 hover:bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="editScope"
                    value="all"
                    checked={editScope === 'all'}
                    onChange={() => setEditScope('all')}
                    className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Todos da série</span>
                </label>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-5 border-t border-slate-100 flex items-center justify-between gap-3">
            {isEditing && canDelete ? (
              <div className="flex items-center gap-2 flex-wrap">
                {initialTransaction?.recurring_expense_id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg('')
                        setDeleteConfirmScope('single')
                      }}
                      disabled={isDeleting || isLoading}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold transition-colors text-xs cursor-pointer flex items-center gap-1.5"
                      title="Exclui apenas este lançamento específico"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                      Excluir Este
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg('')
                        setDeleteConfirmScope('future')
                      }}
                      disabled={isDeleting || isLoading}
                      className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100 font-bold transition-colors text-xs cursor-pointer flex items-center gap-1.5"
                      title="Exclui este lançamento e todos os posteriores desta recorrência"
                    >
                      Excluir Este e Futuros
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg('')
                        setDeleteConfirmScope('all')
                      }}
                      disabled={isDeleting || isLoading}
                      className="px-3 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 font-bold transition-colors text-xs cursor-pointer flex items-center gap-1.5"
                      title="Exclui a regra inteira e todos os lançamentos vinculados"
                    >
                      Excluir Toda a Série
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg('')
                      setDeleteConfirmScope('single')
                    }}
                    disabled={isDeleting || isLoading}
                    className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold transition-colors flex items-center gap-1.5 cursor-pointer text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </button>
                )}
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading || isDeleting}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold transition-colors cursor-pointer text-sm"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isLoading || isDeleting}
                className={`px-6 py-2.5 rounded-xl text-white font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer text-sm ${type === 'income'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  }`}
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isEditing ? 'Salvar Alterações' : 'Confirmar Lançamento'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Modal Customizado de Confirmação de Exclusão */}
      {deleteConfirmScope && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs antialiased animate-in fade-in duration-150 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-150 my-auto max-h-[calc(100dvh-2rem)]">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0 shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  {deleteConfirmScope === 'all'
                    ? 'Excluir toda a série recorrente?'
                    : deleteConfirmScope === 'future'
                      ? 'Excluir este e lançamentos futuros?'
                      : Boolean(initialTransaction?.recurring_expense_id)
                        ? 'Excluir apenas este lançamento?'
                        : 'Excluir este lançamento financeiro?'}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {deleteConfirmScope === 'all'
                    ? 'Esta ação removerá todos os lançamentos vinculados a esta regra de recorrência e cancelará futuras gerações.'
                    : deleteConfirmScope === 'future'
                      ? 'Esta ação removerá este lançamento e todas as ocorrências futuras a partir desta data. Lançamentos anteriores serão mantidos.'
                      : Boolean(initialTransaction?.recurring_expense_id)
                        ? 'Apenas este lançamento específico será removido. As outras ocorrências da recorrência continuarão existindo normalmente.'
                        : 'Este lançamento será excluído permanentemente do sistema financeiro.'}
                </p>
              </div>
            </div>

            {/* Detalhes do lançamento */}
            <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Lançamento:</span>
                <span className="text-slate-900 font-bold truncate max-w-[220px]">
                  {title || initialTransaction?.title}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Valor:</span>
                <span className="text-slate-900 font-bold font-mono">
                  R$ {amount || (initialTransaction ? Number(initialTransaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Vencimento:</span>
                <span className="text-slate-800 font-semibold">
                  {formatDateBR(dueDate || initialTransaction?.due_date)}
                </span>
              </div>
              {Boolean(initialTransaction?.recurring_expense_id) && (
                <div className="pt-2 border-t border-slate-200/70 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Escopo da exclusão:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] ${
                      deleteConfirmScope === 'all'
                        ? 'bg-rose-100 text-rose-800'
                        : deleteConfirmScope === 'future'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {deleteConfirmScope === 'all'
                      ? 'Toda a série'
                      : deleteConfirmScope === 'future'
                        ? 'Este e futuros'
                        : 'Apenas este'}
                  </span>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {/* Ações do modal */}
            <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmScope(null)
                  setErrorMsg('')
                }}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold transition-colors text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => executeDelete(deleteConfirmScope)}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors text-xs cursor-pointer flex items-center gap-2 shadow-sm shadow-rose-600/30"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
