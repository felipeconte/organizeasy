import type { CSSProperties } from 'react'

export type StandardStageColor =
  | 'slate'
  | 'blue'
  | 'amber'
  | 'emerald'
  | 'purple'
  | 'rose'
  | 'indigo'
  | 'cyan'
  | 'orange'
  | 'pink'

export type WorkflowStageColor = StandardStageColor | (string & {})

export interface WorkflowStage {
  id: string // Unique identifier / slug (e.g. 'a_iniciar', 'em_producao', 'em_aprovacao', 'concluido' or 'custom_123456')
  name: string
  color: WorkflowStageColor
  order_index: number
  is_system?: boolean
  is_client_approval_stage?: boolean // Etapa de Validação pelo Cliente
  is_revision_stage?: boolean        // Etapa de Revisão / Solicitação de Ajustes
  is_approved_stage?: boolean        // Etapa Aprovada
  is_final_stage?: boolean           // Etapa Conclusiva / Finalizada
}

export interface StageStyleConfig {
  name: string
  dot: string
  badge: string
  ganttBar: string
  ganttProgress: string
  kanbanHeader: string
  kanbanBg: string
  kanbanBorder: string
  border: string
  text: string
  bg: string
  previewHex: string
  isCustom?: boolean
  customColor?: string
}

export const STAGE_COLOR_CONFIG: Record<StandardStageColor, StageStyleConfig> = {
  slate: {
    name: 'Cinza / Neutro',
    dot: 'bg-slate-400',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    ganttBar: 'from-slate-600 to-slate-700 border-slate-500/30',
    ganttProgress: 'bg-slate-800',
    kanbanHeader: 'text-slate-700',
    kanbanBg: 'bg-slate-100/70',
    kanbanBorder: 'border-slate-200',
    border: 'border-slate-300',
    text: 'text-slate-700',
    bg: 'bg-slate-50',
    previewHex: '#64748b',
  },
  blue: {
    name: 'Azul',
    dot: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    ganttBar: 'from-blue-600 to-blue-700 border-blue-500/30',
    ganttProgress: 'bg-blue-800',
    kanbanHeader: 'text-blue-900',
    kanbanBg: 'bg-blue-50/40',
    kanbanBorder: 'border-blue-200',
    border: 'border-blue-300',
    text: 'text-blue-700',
    bg: 'bg-blue-50',
    previewHex: '#3b82f6',
  },
  amber: {
    name: 'Âmbar / Amarelo',
    dot: 'bg-amber-500 animate-pulse',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    ganttBar: 'from-amber-500 to-amber-600 border-amber-400/30',
    ganttProgress: 'bg-amber-700',
    kanbanHeader: 'text-amber-900',
    kanbanBg: 'bg-amber-50/40',
    kanbanBorder: 'border-amber-200',
    border: 'border-amber-300',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    previewHex: '#f59e0b',
  },
  emerald: {
    name: 'Verde / Esmeralda',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ganttBar: 'from-emerald-600 to-emerald-700 border-emerald-500/30',
    ganttProgress: 'bg-emerald-800',
    kanbanHeader: 'text-emerald-900',
    kanbanBg: 'bg-emerald-50/40',
    kanbanBorder: 'border-emerald-200',
    border: 'border-emerald-300',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    previewHex: '#10b981',
  },
  purple: {
    name: 'Índigo Profundo',
    dot: 'bg-indigo-500',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    ganttBar: 'from-indigo-600 to-indigo-700 border-indigo-500/30',
    ganttProgress: 'bg-indigo-800',
    kanbanHeader: 'text-indigo-900',
    kanbanBg: 'bg-indigo-50/40',
    kanbanBorder: 'border-indigo-200',
    border: 'border-indigo-300',
    text: 'text-indigo-700',
    bg: 'bg-indigo-50',
    previewHex: '#4f46e5',
  },
  rose: {
    name: 'Rosa / Carmim',
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    ganttBar: 'from-rose-600 to-rose-700 border-rose-500/30',
    ganttProgress: 'bg-rose-800',
    kanbanHeader: 'text-rose-900',
    kanbanBg: 'bg-rose-50/40',
    kanbanBorder: 'border-rose-200',
    border: 'border-rose-300',
    text: 'text-rose-700',
    bg: 'bg-rose-50',
    previewHex: '#f43f5e',
  },
  indigo: {
    name: 'Índigo',
    dot: 'bg-indigo-500',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    ganttBar: 'from-indigo-600 to-indigo-700 border-indigo-500/30',
    ganttProgress: 'bg-indigo-800',
    kanbanHeader: 'text-indigo-900',
    kanbanBg: 'bg-indigo-50/40',
    kanbanBorder: 'border-indigo-200',
    border: 'border-indigo-300',
    text: 'text-indigo-700',
    bg: 'bg-indigo-50',
    previewHex: '#6366f1',
  },
  cyan: {
    name: 'Ciano',
    dot: 'bg-cyan-500',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    ganttBar: 'from-cyan-600 to-cyan-700 border-cyan-500/30',
    ganttProgress: 'bg-cyan-800',
    kanbanHeader: 'text-cyan-900',
    kanbanBg: 'bg-cyan-50/40',
    kanbanBorder: 'border-cyan-200',
    border: 'border-cyan-300',
    text: 'text-cyan-700',
    bg: 'bg-cyan-50',
    previewHex: '#06b6d4',
  },
  orange: {
    name: 'Laranja',
    dot: 'bg-orange-500',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    ganttBar: 'from-orange-500 to-orange-600 border-orange-400/30',
    ganttProgress: 'bg-orange-700',
    kanbanHeader: 'text-orange-900',
    kanbanBg: 'bg-orange-50/40',
    kanbanBorder: 'border-orange-200',
    border: 'border-orange-300',
    text: 'text-orange-700',
    bg: 'bg-orange-50',
    previewHex: '#f97316',
  },
  pink: {
    name: 'Pink',
    dot: 'bg-pink-500',
    badge: 'bg-pink-50 text-pink-700 border-pink-200',
    ganttBar: 'from-pink-600 to-pink-700 border-pink-500/30',
    ganttProgress: 'bg-pink-800',
    kanbanHeader: 'text-pink-900',
    kanbanBg: 'bg-pink-50/40',
    kanbanBorder: 'border-pink-200',
    border: 'border-pink-300',
    text: 'text-pink-700',
    bg: 'bg-pink-50',
    previewHex: '#ec4899',
  },
}

export const DEFAULT_WORKFLOW_STAGES: WorkflowStage[] = [
  {
    id: 'a_iniciar',
    name: 'A Iniciar',
    color: 'slate',
    order_index: 0,
    is_system: true,
    is_client_approval_stage: false,
    is_revision_stage: false,
    is_approved_stage: false,
    is_final_stage: false,
  },
  {
    id: 'em_andamento',
    name: 'Em Andamento',
    color: 'blue',
    order_index: 1,
    is_system: true,
    is_client_approval_stage: false,
    is_revision_stage: false,
    is_approved_stage: false,
    is_final_stage: false,
  },
  {
    id: 'em_revisao',
    name: 'Em Revisão',
    color: 'indigo',
    order_index: 2,
    is_system: true,
    is_client_approval_stage: false,
    is_revision_stage: false,
    is_approved_stage: false,
    is_final_stage: false,
  },
  {
    id: 'em_aprovacao',
    name: 'Em Aprovação',
    color: 'amber',
    order_index: 3,
    is_system: true,
    is_client_approval_stage: true,
    is_revision_stage: false,
    is_approved_stage: false,
    is_final_stage: false,
  },
  {
    id: 'pendencia',
    name: 'Pendência',
    color: 'rose',
    order_index: 4,
    is_system: true,
    is_client_approval_stage: false,
    is_revision_stage: true,
    is_approved_stage: false,
    is_final_stage: false,
  },
  {
    id: 'aprovado',
    name: 'Aprovado',
    color: 'emerald',
    order_index: 5,
    is_system: true,
    is_client_approval_stage: false,
    is_revision_stage: false,
    is_approved_stage: true,
    is_final_stage: false,
  },
  {
    id: 'finalizado',
    name: 'Finalizado',
    color: 'cyan',
    order_index: 6,
    is_system: true,
    is_client_approval_stage: false,
    is_revision_stage: false,
    is_approved_stage: false,
    is_final_stage: true,
  },
  {
    id: 'cancelado',
    name: 'Cancelado',
    color: 'slate',
    order_index: 7,
    is_system: true,
    is_client_approval_stage: false,
    is_revision_stage: false,
    is_approved_stage: false,
    is_final_stage: false,
  },
]

export function normalizeWorkflowStages(stages?: WorkflowStage[] | null): WorkflowStage[] {
  if (!stages || !Array.isArray(stages) || stages.length === 0) {
    return DEFAULT_WORKFLOW_STAGES
  }

  const hasAnyExplicitApprovalConfig = stages.some((s) => typeof s.is_client_approval_stage === 'boolean')
  const hasAnyExplicitRevisionConfig = stages.some((s) => typeof s.is_revision_stage === 'boolean')
  const hasAnyExplicitApprovedConfig = stages.some((s) => typeof s.is_approved_stage === 'boolean')
  const hasAnyExplicitFinalConfig = stages.some((s) => typeof s.is_final_stage === 'boolean')

  return [...stages]
    .map((s) => ({
      ...s,
      is_client_approval_stage: hasAnyExplicitApprovalConfig
        ? Boolean(s.is_client_approval_stage)
        : s.id === 'em_aprovacao',
      is_revision_stage: hasAnyExplicitRevisionConfig
        ? Boolean(s.is_revision_stage)
        : (s.id === 'pendencia' || s.id === 'em_producao'),
      is_approved_stage: hasAnyExplicitApprovedConfig
        ? Boolean(s.is_approved_stage)
        : (s.id === 'aprovado' || s.id === 'concluido'),
      is_final_stage: hasAnyExplicitFinalConfig
        ? Boolean(s.is_final_stage)
        : (s.id === 'finalizado' || (s.id === 'concluido' && !stages.some((st) => st.id === 'finalizado'))),
    }))
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
}

export function getClientApprovalStage(customStages?: WorkflowStage[] | null): WorkflowStage | null {
  const stages = normalizeWorkflowStages(customStages)
  return stages.find((s) => s.is_client_approval_stage === true) || stages.find((s) => s.id === 'em_aprovacao') || null
}

export function getRevisionStage(customStages?: WorkflowStage[] | null): WorkflowStage | null {
  const stages = normalizeWorkflowStages(customStages)
  return (
    stages.find((s) => s.is_revision_stage === true) ||
    stages.find((s) => s.id === 'pendencia') ||
    stages.find((s) => s.id === 'em_producao') ||
    stages[0] ||
    null
  )
}

export function getApprovedStage(customStages?: WorkflowStage[] | null): WorkflowStage | null {
  const stages = normalizeWorkflowStages(customStages)
  return (
    stages.find((s) => s.is_approved_stage === true) ||
    stages.find((s) => s.id === 'aprovado') ||
    stages.find((s) => s.id === 'concluido') ||
    stages.find((s) => s.name?.toLowerCase().includes('aprovad')) ||
    stages[stages.length - 1] ||
    null
  )
}

export function getFinalStage(customStages?: WorkflowStage[] | null): WorkflowStage | null {
  const stages = normalizeWorkflowStages(customStages)
  return (
    stages.find((s) => s.is_final_stage === true) ||
    stages.find((s) => s.id === 'finalizado') ||
    stages.find((s) => s.id === 'concluido') ||
    null
  )
}

export function canMoveToFinalStage(
  stage: {
    checklist?: Array<{ completed?: boolean }> | null
    is_client_approval_required?: boolean
    status?: string
  },
  customStages?: WorkflowStage[] | null,
  options?: { allowClientApprovalOverride?: boolean }
): { allowed: boolean; reasons: string[]; isClientApprovalBlocked: boolean; hasChecklistPending: boolean } {
  const reasons: string[] = []
  let isClientApprovalBlocked = false
  let hasChecklistPending = false

  // 1. Verifica itens pendentes de checklist
  if (Array.isArray(stage.checklist) && stage.checklist.length > 0) {
    const pendingCount = stage.checklist.filter((item) => !item.completed).length
    if (pendingCount > 0) {
      hasChecklistPending = true
      reasons.push(`Existem ${pendingCount} item(ns) de checklist ainda não concluído(s).`)
    }
  }

  // 2. Verifica validação do cliente se exigida
  if (stage.is_client_approval_required) {
    const approvalStage = getClientApprovalStage(customStages)
    if (approvalStage && stage.status === approvalStage.id) {
      isClientApprovalBlocked = true
      if (!options?.allowClientApprovalOverride) {
        reasons.push('A tarefa está aguardando validação do cliente e ainda não foi aprovada.')
      }
    }
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    isClientApprovalBlocked,
    hasChecklistPending,
  }
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '').trim()
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16)
    const g = parseInt(clean[1] + clean[1], 16)
    const b = parseInt(clean[2] + clean[2], 16)
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b }
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16)
    const g = parseInt(clean.substring(2, 4), 16)
    const b = parseInt(clean.substring(4, 6), 16)
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b }
  }
  return null
}

export function adjustHexBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const r = Math.max(0, Math.min(255, Math.round(rgb.r * (1 + percent / 100))))
  const g = Math.max(0, Math.min(255, Math.round(rgb.g * (1 + percent / 100))))
  const b = Math.max(0, Math.min(255, Math.round(rgb.b * (1 + percent / 100))))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export function getStageStyle(color?: string | null): StageStyleConfig {
  if (color && color in STAGE_COLOR_CONFIG) {
    return STAGE_COLOR_CONFIG[color as StandardStageColor]
  }

  const rawHex = color?.trim() || '#3B82F6'
  const hex = rawHex.startsWith('#') ? rawHex : `#${rawHex}`
  const textTone = adjustHexBrightness(hex, -25)

  return {
    name: 'Personalizada',
    dot: 'bg-current',
    badge: 'bg-slate-50 border-slate-200 text-slate-800',
    ganttBar: 'border-transparent',
    ganttProgress: '',
    kanbanHeader: 'text-slate-900',
    kanbanBg: 'bg-white',
    kanbanBorder: 'border-slate-200',
    border: 'border-slate-200',
    text: textTone,
    bg: `${hex}15`,
    previewHex: hex,
    isCustom: true,
    customColor: hex,
  }
}

export function getBadgeInlineStyle(style?: StageStyleConfig | null): CSSProperties | undefined {
  if (!style?.isCustom || !style.previewHex) return undefined
  const hex = style.previewHex
  return {
    backgroundColor: `${hex}15`,
    borderColor: `${hex}40`,
    color: adjustHexBrightness(hex, -25),
  }
}

export function getDotInlineStyle(style?: StageStyleConfig | null): CSSProperties | undefined {
  if (!style?.isCustom || !style.previewHex) return undefined
  return {
    backgroundColor: style.previewHex,
  }
}

export function getKanbanColumnInlineStyle(style?: StageStyleConfig | null): CSSProperties | undefined {
  if (!style?.isCustom || !style.previewHex) return undefined
  const hex = style.previewHex
  return {
    backgroundColor: `${hex}08`,
    borderColor: `${hex}30`,
  }
}

export function getKanbanHeaderInlineStyle(style?: StageStyleConfig | null): CSSProperties | undefined {
  if (!style?.isCustom || !style.previewHex) return undefined
  return {
    color: adjustHexBrightness(style.previewHex, -30),
  }
}

export function getGanttBarInlineStyle(style?: StageStyleConfig | null): CSSProperties | undefined {
  if (!style?.isCustom || !style.previewHex) return undefined
  return {
    backgroundColor: style.previewHex,
    borderColor: adjustHexBrightness(style.previewHex, -20),
  }
}

export function getStageConfig(
  stageId: string,
  customStages?: WorkflowStage[] | null
): WorkflowStage & { style: StageStyleConfig } {
  const stages = normalizeWorkflowStages(customStages)
  const found = stages.find((s) => s.id === stageId)
  if (found) {
    const style = getStageStyle(found.color)
    return { ...found, style }
  }

  // Fallbacks para slugs oficiais e legados caso o ID seja diferente
  if (stageId === 'a_iniciar') {
    const def = stages.find((s) => s.id === 'a_iniciar') || stages[0] || DEFAULT_WORKFLOW_STAGES[0]
    return { ...def, style: getStageStyle(def.color) }
  }
  if (stageId === 'em_producao' || stageId === 'em_andamento') {
    const def = stages.find((s) => s.id === 'em_andamento' || s.id === 'em_producao') || DEFAULT_WORKFLOW_STAGES[1]
    return { ...def, style: getStageStyle(def.color) }
  }
  if (stageId === 'em_revisao') {
    const def = stages.find((s) => s.id === 'em_revisao') || DEFAULT_WORKFLOW_STAGES[2]
    return { ...def, style: getStageStyle(def.color) }
  }
  if (stageId === 'em_aprovacao') {
    const def = stages.find((s) => s.id === 'em_aprovacao') || DEFAULT_WORKFLOW_STAGES[3]
    return { ...def, style: getStageStyle(def.color) }
  }
  if (stageId === 'pendencia') {
    const def = stages.find((s) => s.id === 'pendencia') || DEFAULT_WORKFLOW_STAGES[4]
    return { ...def, style: getStageStyle(def.color) }
  }
  if (stageId === 'aprovado') {
    const def = stages.find((s) => s.id === 'aprovado') || DEFAULT_WORKFLOW_STAGES[5]
    return { ...def, style: getStageStyle(def.color) }
  }
  if (stageId === 'finalizado' || stageId === 'concluido') {
    const def = stages.find((s) => s.id === 'finalizado' || s.id === 'concluido') || DEFAULT_WORKFLOW_STAGES[6]
    return { ...def, style: getStageStyle(def.color) }
  }
  if (stageId === 'cancelado') {
    const def = stages.find((s) => s.id === 'cancelado') || DEFAULT_WORKFLOW_STAGES[7]
    return { ...def, style: getStageStyle(def.color) }
  }

  return {
    id: stageId,
    name: stageId,
    color: 'blue',
    order_index: 99,
    is_system: false,
    is_client_approval_stage: false,
    is_revision_stage: false,
    is_approved_stage: false,
    is_final_stage: false,
    style: STAGE_COLOR_CONFIG.blue,
  }
}
