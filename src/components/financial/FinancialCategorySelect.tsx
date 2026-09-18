'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Check,
  ChevronDown,
  Tag,
  Settings2,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  X,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import {
  FinancialCategoryItem,
  FINANCIAL_CATEGORIES,
  TransactionType,
} from '@/types/financial'
import {
  getFinancialCategoriesAction,
  createFinancialCategoryAction,
  updateFinancialCategoryAction,
  deleteFinancialCategoryAction,
} from '@/lib/actions/financial-categories'

export interface FinancialCategorySelectProps {
  value: string
  onChange: (value: string) => void
  type: TransactionType
  organizationId?: string
  name?: string
  disabled?: boolean
  className?: string
  onCategoriesChange?: (categories: FinancialCategoryItem[]) => void
}

export default function FinancialCategorySelect({
  value,
  onChange,
  type,
  organizationId = '',
  name = 'category',
  disabled = false,
  className = '',
  onCategoriesChange,
}: FinancialCategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<'select' | 'manage'>('select')

  // Catálogo de categorias
  const [categories, setCategories] = useState<FinancialCategoryItem[]>(() =>
    FINANCIAL_CATEGORIES.filter((c) => c.type === type).map((c) => ({
      id: c.id,
      name: c.label,
      type: c.type,
      group: c.group,
      color: c.color,
      is_custom: false,
      transaction_count: 0,
    }))
  )
  const [loadingList, setLoadingList] = useState(false)

  // Adição
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  // Edição
  const [editingCategory, setEditingCategory] = useState<{
    id?: string
    oldName: string
    currentName: string
  } | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // Exclusão com migração
  const [deletingTarget, setDeletingTarget] = useState<FinancialCategoryItem | null>(null)
  const [replacementCategory, setReplacementCategory] = useState<string>('')
  const [isMigratingAndDeleting, setIsMigratingAndDeleting] = useState(false)

  // Mensagens inline
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const newAddInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  const isIncome = type === 'income'

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setMode('select')
        setEditingCategory(null)
        setDeletingTarget(null)
        setFeedback(null)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Foco no input de adição ou edição quando ativados
  useEffect(() => {
    if (mode === 'manage') {
      setTimeout(() => newAddInputRef.current?.focus(), 100)
    }
  }, [mode])

  useEffect(() => {
    if (editingCategory) {
      setTimeout(() => editInputRef.current?.focus(), 80)
    }
  }, [editingCategory])

  // Limpa feedback após 4 segundos
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  // Carrega categorias do banco para a organização e tipo atual
  const fetchCategories = async () => {
    if (!organizationId) return
    setLoadingList(true)
    try {
      const res = await getFinancialCategoriesAction(organizationId, type)
      if (res.success && res.categories && res.categories.length > 0) {
        setCategories(res.categories)
        onCategoriesChange?.(res.categories)
      }
    } catch (err) {
      console.warn('Erro ao buscar categorias financeiras:', err)
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    if (organizationId) {
      fetchCategories()
    } else {
      setCategories(
        FINANCIAL_CATEGORIES.filter((c) => c.type === type).map((c) => ({
          id: c.id,
          name: c.label,
          type: c.type,
          group: c.group,
          color: c.color,
          is_custom: false,
          transaction_count: 0,
        }))
      )
    }
  }, [organizationId, type])

  // --- CRUD HANDLERS ---

  // 1. Adicionar Nova Categoria
  const handleAddCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = newCategoryName.trim()
    if (!trimmed || trimmed.length < 2) {
      setFeedback({ type: 'error', text: 'Informe pelo menos 2 caracteres.' })
      return
    }

    const alreadyExists = categories.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    )
    if (alreadyExists) {
      setFeedback({ type: 'error', text: 'Esta categoria já está cadastrada.' })
      return
    }

    setIsAdding(true)
    setFeedback(null)

    try {
      const res = await createFinancialCategoryAction(organizationId, trimmed, type)
      if (res.success && res.category) {
        const newCat = res.category
        setCategories((prev) => {
          const updated = [...prev, newCat].sort((a, b) =>
            a.name.localeCompare(b.name, 'pt-BR')
          )
          onCategoriesChange?.(updated)
          return updated
        })
        onChange(newCat.name)
        setNewCategoryName('')
        setFeedback({
          type: 'success',
          text: `Categoria "${newCat.name}" criada com sucesso!`,
        })
      } else {
        setFeedback({ type: 'error', text: res.error || 'Erro ao adicionar categoria.' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Erro inesperado ao cadastrar.' })
    } finally {
      setIsAdding(false)
    }
  }

  // 2. Iniciar e Salvar Edição / Renomeação
  const handleStartEdit = (cat: FinancialCategoryItem, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingCategory({
      id: cat.id,
      oldName: cat.name,
      currentName: cat.name,
    })
    setDeletingTarget(null)
  }

  const handleSaveEdit = async () => {
    if (!editingCategory) return
    const cleanNew = editingCategory.currentName.trim()
    const old = editingCategory.oldName

    if (!cleanNew || cleanNew.length < 2) {
      setFeedback({ type: 'error', text: 'O nome deve ter pelo menos 2 caracteres.' })
      return
    }

    if (cleanNew.toLowerCase() === old.toLowerCase()) {
      setEditingCategory(null)
      return
    }

    const collision = categories.some(
      (c) =>
        c.name.toLowerCase() === cleanNew.toLowerCase() &&
        c.name.toLowerCase() !== old.toLowerCase()
    )
    if (collision) {
      setFeedback({ type: 'error', text: 'Já existe outra categoria com esse nome.' })
      return
    }

    setIsSavingEdit(true)
    setFeedback(null)

    try {
      const res = await updateFinancialCategoryAction(
        organizationId,
        old,
        cleanNew,
        type,
        editingCategory.id
      )
      if (res.success) {
        setCategories((prev) => {
          const updated = prev
            .map((c) => (c.name === old ? { ...c, name: cleanNew } : c))
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
          onCategoriesChange?.(updated)
          return updated
        })

        // Se o valor selecionado no form era a antiga categoria (por nome ou id legado), atualiza para a nova
        const legacyDef = FINANCIAL_CATEGORIES.find((c) => c.label === old)
        if (
          value.trim().toLowerCase() === old.trim().toLowerCase() ||
          (legacyDef && value === legacyDef.id)
        ) {
          onChange(cleanNew)
        }

        fetchCategories()

        const countMsg = res.countUpdated
          ? ` e ${res.countUpdated} lançamento(s) atualizados`
          : ''
        setFeedback({
          type: 'success',
          text: `Categoria renomeada com sucesso${countMsg}!`,
        })
        setEditingCategory(null)
      } else {
        setFeedback({ type: 'error', text: res.error || 'Erro ao renomear categoria.' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Erro inesperado ao renomear.' })
    } finally {
      setIsSavingEdit(false)
    }
  }

  // 3. Iniciar e Confirmar Exclusão com Migração Obrigatória
  const handleStartDelete = (cat: FinancialCategoryItem, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingTarget(cat)
    setEditingCategory(null)

    // Pré-seleciona a primeira outra categoria disponível como substituta
    const alternative = categories.find(
      (item) => item.name.trim().toLowerCase() !== cat.name.trim().toLowerCase()
    )
    setReplacementCategory(alternative ? alternative.name : '')
  }

  const handleConfirmDeleteAndMigrate = async () => {
    if (!deletingTarget) return

    if (!replacementCategory) {
      setFeedback({
        type: 'error',
        text: 'Por favor, selecione para qual categoria os lançamentos devem ser transferidos.',
      })
      return
    }

    if (
      replacementCategory.trim().toLowerCase() ===
      deletingTarget.name.trim().toLowerCase()
    ) {
      setFeedback({
        type: 'error',
        text: 'A categoria de destino deve ser diferente da que está sendo excluída.',
      })
      return
    }

    setIsMigratingAndDeleting(true)
    setFeedback(null)

    try {
      const res = await deleteFinancialCategoryAction(
        organizationId,
        deletingTarget.name,
        replacementCategory,
        type,
        deletingTarget.id
      )

      if (res.success) {
        const deletedLower = deletingTarget.name.trim().toLowerCase()
        const deletedDisplay = deletingTarget.name
        const legacyDef = FINANCIAL_CATEGORIES.find((c) => c.label === deletingTarget.name)

        setCategories((prev) => {
          const updated = prev.filter(
            (c) => c.name.trim().toLowerCase() !== deletedLower
          )
          onCategoriesChange?.(updated)
          return updated
        })

        // Se a categoria excluída era a atualmente selecionada no form, muda para a substituta
        if (
          value.trim().toLowerCase() === deletedLower ||
          (legacyDef && value === legacyDef.id)
        ) {
          onChange(replacementCategory)
        }

        fetchCategories()

        const countMsg = res.countMigrated
          ? ` (${res.countMigrated} lançamento(s) transferidos para "${replacementCategory}")`
          : ''
        setFeedback({
          type: 'success',
          text: `Categoria "${deletedDisplay}" excluída com sucesso${countMsg}!`,
        })
        setDeletingTarget(null)
      } else {
        setFeedback({ type: 'error', text: res.error || 'Erro ao excluir categoria.' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Erro inesperado ao excluir.' })
    } finally {
      setIsMigratingAndDeleting(false)
    }
  }

  // Identifica o rótulo de exibição no botão gatilho
  const matchedCategory = categories.find((c) => {
    const valLower = (value || '').trim().toLowerCase()
    if (c.name.trim().toLowerCase() === valLower) return true
    if (c.id && c.id.toLowerCase() === valLower) return true
    return false
  })

  // Se não encontrou nas categorias carregadas, verifica nas padrão
  const fallbackLegacy = FINANCIAL_CATEGORIES.find((c) => c.id === value)
  const displayValue = matchedCategory
    ? matchedCategory.name
    : fallbackLegacy
      ? fallbackLegacy.label
      : value || 'Selecione a Categoria'

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Campo Oculto para Formulários Tradicionais */}
      <input type="hidden" name={name} value={value} />

      {/* Botão Gatilho do Dropdown */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev)
            if (!isOpen) {
              setMode('select')
              setDeletingTarget(null)
              setEditingCategory(null)
            }
          }
        }}
        className={`w-full h-11 flex items-center justify-between px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 transition-all text-left focus:outline-none focus:ring-2 ${
          isIncome ? 'focus:ring-emerald-500/20 focus:border-emerald-600' : 'focus:ring-rose-500/20 focus:border-rose-600'
        } cursor-pointer ${
          disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-slate-300'
        } ${
          isOpen
            ? isIncome
              ? 'ring-2 ring-emerald-500/20 border-emerald-600'
              : 'ring-2 ring-rose-500/20 border-rose-600'
            : ''
        }`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
              isIncome
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-rose-50 text-rose-600'
            }`}
          >
            {isIncome ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
          </div>
          <span className="truncate font-semibold text-slate-800">
            {displayValue}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen
              ? isIncome
                ? 'rotate-180 text-emerald-600'
                : 'rotate-180 text-rose-600'
              : ''
          }`}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden min-w-full w-[340px] sm:w-[380px] max-w-[calc(100vw-2rem)] animate-in fade-in zoom-in-95 duration-150">
          {/* Alerta / Feedback Inline */}
          {feedback && (
            <div
              className={`p-2.5 px-3 text-xs font-semibold flex items-center justify-between border-b ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                  : 'bg-rose-50 text-rose-800 border-rose-100'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    feedback.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                <span className="truncate">{feedback.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="p-0.5 hover:bg-black/5 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* MODO 1: SELEÇÃO RÁPIDA */}
          {mode === 'select' && (
            <div className="p-1.5">
              <div className="px-2.5 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>
                  {isIncome ? 'Categorias de Receita' : 'Categorias de Despesa'}
                </span>
                {loadingList && (
                  <Loader2
                    className={`w-3 h-3 animate-spin ${
                      isIncome ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  />
                )}
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1 py-1 pr-0.5">
                {categories.map((c) => {
                  const valLower = (value || '').trim().toLowerCase()
                  const isSelected =
                    c.name.trim().toLowerCase() === valLower ||
                    (c.id && c.id.toLowerCase() === valLower) ||
                    (fallbackLegacy && fallbackLegacy.label === c.name)

                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => {
                        onChange(c.name)
                        setIsOpen(false)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all cursor-pointer text-left ${
                        isSelected
                          ? isIncome
                            ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 shadow-2xs'
                            : 'bg-rose-50 text-rose-700 font-bold border border-rose-100 shadow-2xs'
                          : 'text-slate-700 hover:bg-slate-50 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="truncate">{c.name}</span>
                        {c.transaction_count !== undefined && c.transaction_count > 0 && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                              isSelected
                                ? isIncome
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                            title={`${c.transaction_count} lançamento(s) com esta categoria`}
                          >
                            {c.transaction_count}{' '}
                            {c.transaction_count === 1 ? 'lanç.' : 'lanç.'}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <Check
                          className={`w-4 h-4 shrink-0 ml-2 ${
                            isIncome ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Rodapé: Botão de Alternar para o Modo Gerenciar */}
              <div className="pt-1.5 mt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setMode('manage')
                    setFeedback(null)
                  }}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 rounded-xl transition-all cursor-pointer ${
                    isIncome
                      ? 'hover:text-emerald-600 hover:bg-emerald-50/60'
                      : 'hover:text-rose-600 hover:bg-rose-50/60'
                  }`}
                >
                  <Settings2 className="w-3.5 h-3.5 text-slate-400" />
                  Gerenciar Categorias
                </button>
              </div>
            </div>
          )}

          {/* MODO 2: GERENCIAMENTO (CRUD INTEGRADO NO DROPDOWN) */}
          {mode === 'manage' && (
            <div className="p-2 space-y-2.5">
              {/* Topo do Gerenciador: Voltar */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 px-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setMode('select')
                    setDeletingTarget(null)
                    setEditingCategory(null)
                    setFeedback(null)
                  }}
                  className={`inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 transition-colors cursor-pointer whitespace-nowrap ${
                    isIncome ? 'hover:text-emerald-600' : 'hover:text-rose-600'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar
                </button>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Gestão de Categorias ({isIncome ? 'Receitas' : 'Despesas'})
                </span>
              </div>

              {/* Sub-painel: Diálogo de Confirmação de Exclusão & Migração de Lançamentos */}
              {deletingTarget ? (
                <div className="p-3 bg-rose-50/80 rounded-xl border border-rose-200/80 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-start gap-2.5 text-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold leading-tight">
                        Excluir &ldquo;{deletingTarget.name}&rdquo;?
                      </p>
                      <p className="text-[11px] text-rose-700 mt-1 leading-snug">
                        {deletingTarget.transaction_count &&
                        deletingTarget.transaction_count > 0 ? (
                          <>
                            Existem{' '}
                            <strong>
                              {deletingTarget.transaction_count} lançamento(s)
                            </strong>{' '}
                            com esta categoria. Para manter a integridade contábil, selecione para
                            qual categoria eles serão transferidos:
                          </>
                        ) : (
                          <>
                            Selecione para qual categoria substituta migrar eventuais registros:
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Seletor da Categoria Substituta */}
                  <div>
                    <label className="block text-[11px] font-bold text-rose-900 uppercase tracking-wider mb-1">
                      Transferir lançamentos para:
                    </label>
                    <select
                      value={replacementCategory}
                      disabled={isMigratingAndDeleting}
                      onChange={(e) => setReplacementCategory(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-rose-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400/20 focus:border-rose-500"
                    >
                      {categories
                        .filter(
                          (c) =>
                            c.name.trim().toLowerCase() !==
                            deletingTarget.name.trim().toLowerCase()
                        )
                        .map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Ações de Confirmação */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isMigratingAndDeleting}
                      onClick={() => setDeletingTarget(null)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isMigratingAndDeleting}
                      onClick={handleConfirmDeleteAndMigrate}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      {isMigratingAndDeleting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Migrando...</span>
                        </>
                      ) : (
                        <span>Transferir e Excluir</span>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Formulário Compacto para Adicionar Nova Categoria */
                <form onSubmit={handleAddCategory} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      ref={newAddInputRef}
                      type="text"
                      placeholder={
                        isIncome
                          ? 'Nova receita (ex: Consultoria Acústica)...'
                          : 'Nova despesa (ex: Plotagens / Cópias)...'
                      }
                      value={newCategoryName}
                      disabled={isAdding}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className={`flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 ${
                        isIncome
                          ? 'focus:ring-emerald-500/20 focus:border-emerald-600'
                          : 'focus:ring-rose-500/20 focus:border-rose-600'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={isAdding || !newCategoryName.trim()}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50 shrink-0 whitespace-nowrap ${
                        isIncome
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-rose-600 hover:bg-rose-700'
                      }`}
                    >
                      {isAdding ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>Adicionar</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de Categorias com Opções de Editar e Excluir */}
              <div className="max-h-56 overflow-y-auto space-y-1 py-1">
                {categories.map((c) => {
                  const isBeingEdited = editingCategory?.oldName === c.name

                  // Linha em Modo de Edição Inline
                  if (isBeingEdited) {
                    return (
                      <div
                        key={c.name}
                        className={`flex items-center gap-1.5 p-1 rounded-xl border ${
                          isIncome
                            ? 'bg-emerald-50/50 border-emerald-300'
                            : 'bg-rose-50/50 border-rose-300'
                        }`}
                      >
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingCategory.currentName}
                          disabled={isSavingEdit}
                          onChange={(e) =>
                            setEditingCategory({
                              ...editingCategory,
                              currentName: e.target.value,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleSaveEdit()
                            } else if (e.key === 'Escape') {
                              setEditingCategory(null)
                            }
                          }}
                          className={`flex-1 min-w-0 px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white border rounded-lg focus:outline-none focus:ring-1 ${
                            isIncome
                              ? 'border-emerald-200 focus:ring-emerald-500'
                              : 'border-rose-200 focus:ring-rose-500'
                          }`}
                        />
                        <button
                          type="button"
                          disabled={isSavingEdit}
                          onClick={handleSaveEdit}
                          className="p-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Salvar e atualizar lançamentos"
                        >
                          {isSavingEdit ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={isSavingEdit}
                          onClick={() => setEditingCategory(null)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer shrink-0"
                          title="Cancelar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  }

                  // Linha Normal
                  return (
                    <div
                      key={c.name}
                      className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50/60 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all group gap-2"
                    >
                      <div className="flex items-center gap-2 truncate min-w-0">
                        <span className="text-xs font-semibold text-slate-700 truncate">
                          {c.name}
                        </span>
                        {c.transaction_count !== undefined && c.transaction_count > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-slate-200/70 text-slate-600 shrink-0 whitespace-nowrap">
                            {c.transaction_count}{' '}
                            {c.transaction_count === 1 ? 'lanç.' : 'lanç.'}
                          </span>
                        )}
                      </div>

                      {/* Ações de Edição e Exclusão */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleStartEdit(c, e)}
                          className={`p-1.5 text-slate-400 rounded-lg transition-colors cursor-pointer ${
                            isIncome
                              ? 'hover:text-emerald-600 hover:bg-emerald-50'
                              : 'hover:text-rose-600 hover:bg-rose-50'
                          }`}
                          title="Renomear categoria (atualiza lançamentos existentes)"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Botão de Excluir só aparece se houver mais de 1 categoria */}
                        {categories.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => handleStartDelete(c, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir categoria e transferir lançamentos"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
