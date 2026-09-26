'use client'

import { useState, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Send,
  Check,
  Calendar,
  User,
  ListTodo,
  Paperclip,
  MessageSquare,
  Plus,
  Trash2,
  Save,
  Loader2,
  ShieldCheck,
  FileText,
  Image as ImageIcon,
  File,
  Link2,
  AlertTriangle,
  Pencil,
  Flag,
  Eye,
  EyeOff,
  Globe,
  GitFork,
  ChevronRight,
  Unlink,
  Copy
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  updateStageFullDetailsAction,
  toggleStageChecklistItemAction,
  addStageChecklistItemAction,
  editStageChecklistItemAction,
  deleteStageChecklistItemAction,
  addStageCommentAction,
  editStageCommentAction,
  deleteStageCommentAction,
  addStageAttachmentAction,
  uploadStageAttachmentFileAction,
  editStageAttachmentAction,
  toggleStageAttachmentVisibilityAction,
  deleteStageAttachmentAction,
  deleteStageAction,
  createStageAction,
  unlinkSubtaskAction,
  manualApproveStageOverrideAction,
  ChecklistItem,
  StageComment,
  StageAttachment
} from '@/lib/actions/stages'
import {
  formatDateBR,
  formatDateTimeBR,
  calculateDueDateFromDuration,
  calculateDurationDays,
  getTaskTimelineStatus,
  DurationType,
} from '@/lib/date-utils'
import DurationTypeToggle from '@/components/ui/DurationTypeToggle'
import { useConfirm, useAlert, usePromptSaveOrDiscard } from '@/components/ui/ConfirmDialog'
import {
  WorkflowStage,
  DEFAULT_WORKFLOW_STAGES,
  getStageConfig,
  getBadgeInlineStyle,
  getDotInlineStyle,
  canMoveToFinalStage,
  getFinalStage
} from '@/lib/workflow-stages'
import { usePermissions } from '@/contexts/PermissionsContext'
import { ManualApprovalModal } from '@/components/projects/ManualApprovalModal'
import { BreadcrumbSetter } from '@/contexts/BreadcrumbContext'
import type { TaskDetailData, MemberOption } from '@/components/projects/TaskDetailDrawer'

export interface TaskDetailPageClientProps {
  initialStage: TaskDetailData
  projectId: string
  project: {
    id: string
    title: string
    code?: string | null
    organization_id: string
  }
  workflowStages?: WorkflowStage[]
  members?: MemberOption[]
  allStages?: TaskDetailData[]
  readOnly?: boolean
  portalToken?: string
}

export default function TaskDetailPageClient({
  initialStage,
  projectId,
  project,
  workflowStages = DEFAULT_WORKFLOW_STAGES,
  members = [],
  allStages: propAllStages = [],
  readOnly = false,
}: TaskDetailPageClientProps) {
  const router = useRouter()
  const confirm = useConfirm()
  const showAlert = useAlert()
  const promptSaveOrDiscard = usePromptSaveOrDiscard()
  const { can, isOwner } = usePermissions()
  const canOverrideApproval = isOwner || can('tasks_override_approval')

  // Estado da tarefa atual e lista de todas as tarefas para hierarquia
  const [stage, setStage] = useState<TaskDetailData>(initialStage)
  const [allStages, setAllStages] = useState<TaskDetailData[]>(propAllStages)

  const [manualApprovalModalOpen, setManualApprovalModalOpen] = useState(false)
  const [pendingTargetStatus, setPendingTargetStatus] = useState<string | null>(null)
  const [submittingManualApproval, setSubmittingManualApproval] = useState(false)
  const [deletingStage, setDeletingStage] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const initialType: DurationType = stage.duration_type === 'uteis' ? 'uteis' : 'corridos'
  const initialDur: number | '' =
    stage.duration_days != null
      ? Number(stage.duration_days)
      : (calculateDurationDays(stage.start_date, stage.due_date, initialType) ?? '')

  const [formData, setFormData] = useState<{
    name: string
    description: string
    assigned_to: string
    start_date: string
    due_date: string
    duration_days: number | ''
    duration_type: DurationType
    status: string
    is_client_approval_required: boolean
  }>({
    name: stage.name || '',
    description: stage.description || '',
    assigned_to: stage.assigned_to || '',
    start_date: stage.start_date || '',
    due_date: stage.due_date || '',
    duration_days: initialDur,
    duration_type: initialType,
    status: stage.status || 'a_iniciar',
    is_client_approval_required: stage.is_client_approval_required ?? true,
  })

  // Baseline para rastrear alterações não salvas
  const [initialFormData, setInitialFormData] = useState({ ...formData })

  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    Array.isArray(stage.checklist) ? stage.checklist : []
  )
  const [comments, setComments] = useState<StageComment[]>(
    Array.isArray(stage.comments) ? stage.comments : []
  )
  const [attachments, setAttachments] = useState<StageAttachment[]>(
    Array.isArray(stage.attachments) ? stage.attachments : []
  )

  // Checklist states
  const [newChecklistText, setNewChecklistText] = useState('')
  const [newChecklistDueDate, setNewChecklistDueDate] = useState('')
  const [newChecklistAssignedTo, setNewChecklistAssignedTo] = useState('')
  const [editingChecklistItemId, setEditingChecklistItemId] = useState<string | null>(null)
  const [editingChecklistText, setEditingChecklistText] = useState('')
  const [editingChecklistDueDate, setEditingChecklistDueDate] = useState('')
  const [editingChecklistAssignedTo, setEditingChecklistAssignedTo] = useState('')
  const [savingChecklistItemId, setSavingChecklistItemId] = useState<string | null>(null)

  // Comments states
  const [newCommentText, setNewCommentText] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const [savingCommentId, setSavingCommentId] = useState<string | null>(null)

  // Attachments states
  const [showAddAttachment, setShowAddAttachment] = useState(false)
  const [attachmentMode, setAttachmentMode] = useState<'file' | 'link'>('file')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [newAttachmentName, setNewAttachmentName] = useState('')
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('')
  const [newAttachmentVisibleToClient, setNewAttachmentVisibleToClient] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [togglingVisibilityId, setTogglingVisibilityId] = useState<string | null>(null)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [editingAttachmentId, setEditingAttachmentId] = useState<string | null>(null)
  const [editingAttachmentName, setEditingAttachmentName] = useState('')
  const [savingAttachmentId, setSavingAttachmentId] = useState<string | null>(null)

  // Subtasks states
  const [showAddSubtask, setShowAddSubtask] = useState(false)
  const [newSubtaskName, setNewSubtaskName] = useState('')
  const [newSubtaskAssignedTo, setNewSubtaskAssignedTo] = useState('')
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState('')
  const [creatingSubtask, setCreatingSubtask] = useState(false)
  const [subtaskDeleteModalOpen, setSubtaskDeleteModalOpen] = useState(false)
  const [unlinkingSubtaskId, setUnlinkingSubtaskId] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Subtarefas diretas desta etapa
  const subtasks = useMemo(() => {
    if (!stage.id || !allStages) return []
    return allStages.filter((s) => s.parent_stage_id === stage.id)
  }, [stage.id, allStages])

  // Subtarefas concluídas
  const completedSubtasksCount = useMemo(() => {
    return subtasks.filter((s) => {
      const cfg = workflowStages.find((ws) => ws.id === s.status)
      return s.status === 'concluido' || Boolean(cfg?.is_final_stage)
    }).length
  }, [subtasks, workflowStages])

  const subtaskProgressPercent =
    subtasks.length > 0 ? Math.round((completedSubtasksCount / subtasks.length) * 100) : 0

  // Cadeia de ancestrais
  const ancestors = useMemo(() => {
    if (!stage.parent_stage_id || !allStages) return []
    const list: TaskDetailData[] = []
    let currId: string | null = stage.parent_stage_id
    const visited = new Set<string>()
    while (currId && !visited.has(currId)) {
      visited.add(currId)
      const p = allStages.find((s) => s.id === currId)
      if (p) {
        list.unshift(p)
        currId = p.parent_stage_id || null
      } else {
        break
      }
    }
    return list
  }, [stage.parent_stage_id, allStages])

  // Verifica alterações não salvas
  const isDirty = useMemo(() => {
    return (
      (formData.name ?? '') !== (initialFormData.name ?? '') ||
      (formData.description ?? '') !== (initialFormData.description ?? '') ||
      (formData.assigned_to ?? '') !== (initialFormData.assigned_to ?? '') ||
      (formData.start_date ?? '') !== (initialFormData.start_date ?? '') ||
      (formData.due_date ?? '') !== (initialFormData.due_date ?? '') ||
      formData.duration_days !== initialFormData.duration_days ||
      formData.duration_type !== initialFormData.duration_type ||
      formData.status !== initialFormData.status ||
      Boolean(formData.is_client_approval_required) !==
      Boolean(initialFormData.is_client_approval_required)
    )
  }, [formData, initialFormData])

  // Status da Etapa / Configuração do Workflow
  const stageConfig = getStageConfig(formData.status, workflowStages)
  const isTaskFinalized = Boolean(stageConfig.is_final_stage || formData.status === 'concluido')
  const timelineStatus = getTaskTimelineStatus(
    formData.start_date,
    formData.due_date,
    isTaskFinalized,
    formData.duration_type
  )

  // Handlers para cálculo bidirecional de Datas e Duração
  const handleStartDateChange = (newStart: string) => {
    let newDue = formData.due_date
    if (newStart && formData.duration_days !== '' && Number(formData.duration_days) > 0) {
      newDue = calculateDueDateFromDuration(newStart, Number(formData.duration_days), formData.duration_type)
    } else if (newStart && newDue) {
      const calculatedDays = calculateDurationDays(newStart, newDue, formData.duration_type)
      if (calculatedDays) {
        setFormData((prev) => ({
          ...prev,
          start_date: newStart,
          due_date: newDue,
          duration_days: calculatedDays,
        }))
        return
      }
    }
    setFormData((prev) => ({ ...prev, start_date: newStart, due_date: newDue }))
  }

  const handleDurationChange = (val: string) => {
    if (val === '') {
      setFormData((prev) => ({ ...prev, duration_days: '' }))
      return
    }
    const num = parseInt(val, 10)
    if (isNaN(num) || num < 1) return

    let newDue = formData.due_date
    if (formData.start_date) {
      newDue = calculateDueDateFromDuration(formData.start_date, num, formData.duration_type)
    }
    setFormData((prev) => ({ ...prev, duration_days: num, due_date: newDue }))
  }

  const handleDurationTypeChange = (newType: DurationType) => {
    let newDue = formData.due_date
    if (formData.start_date && formData.duration_days !== '' && Number(formData.duration_days) > 0) {
      newDue = calculateDueDateFromDuration(formData.start_date, Number(formData.duration_days), newType)
    }
    setFormData((prev) => ({ ...prev, duration_type: newType, due_date: newDue }))
  }

  const handleDueDateChange = (newDue: string) => {
    let newDuration: number | '' = formData.duration_days
    if (formData.start_date && newDue) {
      const calculatedDays = calculateDurationDays(formData.start_date, newDue, formData.duration_type)
      if (calculatedDays) {
        newDuration = calculatedDays
      }
    }
    setFormData((prev) => ({ ...prev, due_date: newDue, duration_days: newDuration }))
  }

  // Helper para salvar dados principais
  const handleSaveDetails = useCallback(async (): Promise<boolean> => {
    if (!stage) return false
    setSaving(true)
    const res = await updateStageFullDetailsAction(projectId, stage.id, {
      name: formData.name,
      description: formData.description,
      assigned_to: formData.assigned_to || null,
      start_date: formData.start_date || null,
      due_date: formData.due_date || null,
      duration_type: formData.duration_type,
      status: formData.status,
      is_client_approval_required: formData.is_client_approval_required,
    })
    setSaving(false)

    if (res.success) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
      setInitialFormData({ ...formData })
      if (res.comments) {
        setComments(res.comments)
      }
      const updatedDurationDays =
        typeof formData.duration_days === 'number' ? formData.duration_days : null
      setStage((prev) => ({
        ...prev,
        ...formData,
        duration_days: updatedDurationDays,
        comments: res.comments || comments,
      }))
      setAllStages((prev) =>
        prev.map((s) => (s.id === stage.id ? { ...s, ...formData, duration_days: updatedDurationDays } : s))
      )
      return true
    } else {
      await showAlert({
        title: 'Erro ao salvar',
        message: res.error || 'Erro ao salvar alterações da tarefa.',
        variant: 'error',
      })
      return false
    }
  }, [projectId, stage, formData, comments, showAlert])

  // Voltar ao projeto respeitando alterações não salvas
  const handleBackToProject = async () => {
    if (isDirty) {
      const choice = await promptSaveOrDiscard({
        title: 'Salvar alterações da tarefa?',
        message: 'Você realizou alterações nos campos desta tarefa que ainda não foram salvas.',
        description: 'Deseja salvar antes de voltar ao projeto?',
        saveText: 'Salvar e Voltar',
        discardText: 'Voltar sem Salvar',
        cancelText: 'Continuar na Tarefa',
      })

      if (choice === 'save') {
        const saved = await handleSaveDetails()
        if (saved) {
          router.push(`/app/projetos/${projectId}`)
        }
      } else if (choice === 'discard') {
        router.push(`/app/projetos/${projectId}`)
      }
    } else {
      router.push(`/app/projetos/${projectId}`)
    }
  }

  // Copiar link direto da tarefa
  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      // fallback
    }
  }

  // Navegar para outra tarefa na hierarquia
  const handleNavigateToTask = async (targetId: string) => {
    if (isDirty) {
      const choice = await promptSaveOrDiscard({
        title: 'Salvar alterações atuais?',
        message: 'Você possui alterações não salvas nesta tarefa.',
        description: 'Deseja salvar antes de abrir a outra tarefa?',
        saveText: 'Salvar e Abrir',
        discardText: 'Abrir sem Salvar',
        cancelText: 'Continuar Aqui',
      })

      if (choice === 'save') {
        const saved = await handleSaveDetails()
        if (saved) {
          router.push(`/app/projetos/${projectId}/tarefas/${targetId}`)
        }
      } else if (choice === 'discard') {
        router.push(`/app/projetos/${projectId}/tarefas/${targetId}`)
      }
      return
    }
    router.push(`/app/projetos/${projectId}/tarefas/${targetId}`)
  }

  // Status Change
  const handleStatusSelectChange = async (newStatus: string) => {
    if (!stage) return
    const targetCfg = workflowStages.find((s) => s.id === newStatus)
    if (targetCfg?.is_final_stage && newStatus !== stage.status) {
      const check = canMoveToFinalStage(
        {
          checklist,
          is_client_approval_required: formData.is_client_approval_required,
          status: newStatus,
        },
        workflowStages
      )
      if (!check.allowed) {
        if (check.isClientApprovalBlocked && !check.hasChecklistPending && canOverrideApproval) {
          setPendingTargetStatus(newStatus)
          setManualApprovalModalOpen(true)
          return
        }
        await showAlert({
          title: 'Etapa Conclusiva Bloqueada',
          message: 'Esta tarefa não pode ser colocada na etapa finalizada:',
          description: check.reasons.join('\n'),
          variant: 'warning',
        })
        return
      }
    }

    const isApprovedStage = Boolean(
      targetCfg?.is_approved_stage ||
      targetCfg?.name?.toLowerCase().includes('aprovad') ||
      newStatus === 'concluido'
    )

    if (isApprovedStage && newStatus !== stage.status) {
      const confirmed = await confirm({
        title: 'Confirmar Aprovação da Tarefa',
        message: `Deseja marcar a tarefa "${formData.name || stage.name}" como "${targetCfg?.name || 'Aprovado'}"?`,
        description:
          'Seu usuário será registrado como o responsável pela aprovação no histórico de auditoria.',
        confirmText: 'Confirmar e Aprovar',
        cancelText: 'Cancelar',
        variant: 'primary',
      })

      if (!confirmed) return
    }

    setFormData((prev) => ({ ...prev, status: newStatus }))
  }

  const handleConfirmManualApproval = async (justification: string) => {
    if (!stage) return
    setSubmittingManualApproval(true)
    const target = pendingTargetStatus || getFinalStage(workflowStages)?.id || 'concluido'
    const res = await manualApproveStageOverrideAction(projectId, stage.id, justification, target)
    setSubmittingManualApproval(false)
    if (res.error) {
      await showAlert({
        title: 'Erro ao aprovar',
        message: res.error,
        variant: 'error',
      })
      return
    }
    if (res.comments) {
      setComments(res.comments)
    }
    setFormData((prev) => ({ ...prev, status: res.status || target }))
    setInitialFormData((prev) => ({ ...prev, status: res.status || target }))
    await showAlert({
      title: 'Etapa Aprovada Manualmente',
      message: 'A aprovação manual foi registrada com sucesso!',
      description: 'A justificativa foi salva no histórico de auditoria.',
      variant: 'success',
    })
  }

  // Delete Stage Action
  const handleDeleteCurrentStage = async () => {
    if (!stage) return

    if (subtasks.length > 0) {
      setSubtaskDeleteModalOpen(true)
      return
    }

    const codeDisplay = stage.code ? `[${stage.code}] ` : ''
    const confirmed = await confirm({
      title: 'Excluir Tarefa',
      message: `Tem certeza que deseja excluir a tarefa ${codeDisplay}"${stage.name}"?`,
      description: 'A tarefa será movida para o histórico de tarefas excluídas e poderá ser restaurada.',
      confirmText: 'Excluir Tarefa',
      cancelText: 'Cancelar',
      variant: 'danger',
    })

    if (confirmed) {
      setDeletingStage(true)
      const res = await deleteStageAction(projectId, stage.id, 'cascade')
      setDeletingStage(false)
      if (res.success) {
        router.push(`/app/projetos/${projectId}`)
      } else {
        await showAlert({
          title: 'Erro ao excluir',
          message: res.error || 'Erro ao excluir tarefa.',
          variant: 'error',
        })
      }
    }
  }

  const handleConfirmDeleteWithSubtasks = async (mode: 'cascade' | 'unlink') => {
    if (!stage) return
    setDeletingStage(true)
    const res = await deleteStageAction(projectId, stage.id, mode)
    setDeletingStage(false)
    setSubtaskDeleteModalOpen(false)

    if (res.success) {
      router.push(`/app/projetos/${projectId}`)
    } else {
      await showAlert({
        title: 'Erro ao excluir tarefa',
        message: res.error || 'Não foi possível excluir a tarefa.',
        variant: 'error',
      })
    }
  }

  // Checklist Actions
  const handleToggleChecklist = async (itemId: string, currentCompleted: boolean) => {
    if (!stage) return
    const updated = checklist.map((item) =>
      item.id === itemId ? { ...item, completed: !currentCompleted } : item
    )
    setChecklist(updated)
    await toggleStageChecklistItemAction(projectId, stage.id, itemId, !currentCompleted)
  }

  const handleAddChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChecklistText.trim() || !stage) return

    const res = await addStageChecklistItemAction(
      projectId,
      stage.id,
      newChecklistText,
      newChecklistDueDate || null,
      newChecklistAssignedTo || null
    )
    if (res.success && res.item) {
      setChecklist((prev) => [...prev, res.item!])
      setNewChecklistText('')
      setNewChecklistDueDate('')
      setNewChecklistAssignedTo('')
    }
  }

  const handleStartEditChecklist = (item: ChecklistItem) => {
    setEditingChecklistItemId(item.id)
    setEditingChecklistText(item.text)
    setEditingChecklistDueDate(item.due_date || '')
    setEditingChecklistAssignedTo(item.assigned_to || '')
  }

  const handleCancelEditChecklist = () => {
    setEditingChecklistItemId(null)
    setEditingChecklistText('')
    setEditingChecklistDueDate('')
    setEditingChecklistAssignedTo('')
  }

  const handleSaveEditChecklist = async (itemId: string) => {
    if (!editingChecklistText.trim() || !stage) return
    setSavingChecklistItemId(itemId)

    const res = await editStageChecklistItemAction(
      projectId,
      stage.id,
      itemId,
      editingChecklistText,
      editingChecklistDueDate || null,
      editingChecklistAssignedTo || null
    )
    setSavingChecklistItemId(null)

    if (res.success && res.item) {
      setChecklist((prev) => prev.map((item) => (item.id === itemId ? res.item! : item)))
      handleCancelEditChecklist()
    } else {
      await showAlert({
        title: 'Erro ao editar item',
        message: res.error || 'Erro ao salvar alterações no checklist.',
        variant: 'error',
      })
    }
  }

  const handleDeleteChecklistItem = async (itemId: string) => {
    if (!stage) return
    setChecklist((prev) => prev.filter((item) => item.id !== itemId))
    await deleteStageChecklistItemAction(projectId, stage.id, itemId)
  }

  // Comments Actions
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCommentText.trim() || !stage) return

    const res = await addStageCommentAction(projectId, stage.id, newCommentText)
    if (res.success && res.comment) {
      setComments((prev) => [res.comment!, ...prev])
      setNewCommentText('')
    } else {
      await showAlert({
        title: 'Erro ao comentar',
        message: res.error || 'Não foi possível salvar o comentário.',
        variant: 'error',
      })
    }
  }

  const handleStartEditComment = (comment: StageComment) => {
    setEditingCommentId(comment.id)
    setEditingCommentText(comment.text)
  }

  const handleCancelEditComment = () => {
    setEditingCommentId(null)
    setEditingCommentText('')
  }

  const handleSaveEditComment = async (commentId: string) => {
    if (!editingCommentText.trim() || !stage) return
    setSavingCommentId(commentId)

    const res = await editStageCommentAction(projectId, stage.id, commentId, editingCommentText)
    setSavingCommentId(null)

    if (res.success && res.comment) {
      setComments((prev) => prev.map((c) => (c.id === commentId ? res.comment! : c)))
      handleCancelEditComment()
    } else {
      await showAlert({
        title: 'Erro ao editar comentário',
        message: res.error || 'Erro ao salvar alteração no comentário.',
        variant: 'error',
      })
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!stage) return
    const confirmed = await confirm({
      title: 'Excluir Comentário',
      message: 'Tem certeza que deseja excluir este comentário permanentemente?',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'danger',
    })

    if (confirmed) {
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      await deleteStageCommentAction(projectId, stage.id, commentId)
    }
  }

  // Upload de Arquivos e Links
  const handleUploadFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAttachmentError(null)

    if (!selectedFile || !stage) {
      setAttachmentError('Por favor, selecione um arquivo no seu dispositivo.')
      return
    }

    setUploadingFile(true)
    const displayName = newAttachmentName.trim() || selectedFile.name
    const sanitizedFileName = displayName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${projectId}/${stage.id}/${Date.now()}_${sanitizedFileName}`

    const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    try {
      const supabase = createClient()
      const { error: storageError } = await supabase.storage
        .from('task-attachments')
        .upload(storagePath, selectedFile, {
          cacheControl: '3600',
          upsert: true,
        })

      if (!storageError) {
        let fileUrl = ''
        const { data: signedData } = await supabase.storage
          .from('task-attachments')
          .createSignedUrl(storagePath, 60 * 60 * 24 * 365)

        if (signedData?.signedUrl) {
          fileUrl = signedData.signedUrl
        } else {
          const { data: publicData } = supabase.storage
            .from('task-attachments')
            .getPublicUrl(storagePath)
          fileUrl = publicData.publicUrl
        }

        const res = await addStageAttachmentAction(projectId, stage.id, {
          name: displayName,
          url: fileUrl,
          size: formatSize(selectedFile.size),
          is_visible_to_client: newAttachmentVisibleToClient,
        })

        if (res.success && res.attachment) {
          setAttachments((prev) => [...prev, res.attachment!])
          setSelectedFile(null)
          setNewAttachmentName('')
          setNewAttachmentVisibleToClient(false)
          setShowAddAttachment(false)
          setUploadingFile(false)
          return
        }
      }
    } catch (clientErr) {
      console.warn('Client upload fallback:', clientErr)
    }

    try {
      const uploadData = new FormData()
      uploadData.append('file', selectedFile)
      if (newAttachmentName.trim()) {
        uploadData.append('name', newAttachmentName.trim())
      }
      uploadData.append('isVisibleToClient', String(newAttachmentVisibleToClient))

      const res = await uploadStageAttachmentFileAction(projectId, stage.id, uploadData)
      if (res.success && res.attachment) {
        setAttachments((prev) => [...prev, res.attachment!])
        setSelectedFile(null)
        setNewAttachmentName('')
        setNewAttachmentVisibleToClient(false)
        setShowAddAttachment(false)
      } else {
        setAttachmentError(res.error || 'Erro ao enviar arquivo para o Storage.')
      }
    } catch (err: unknown) {
      setAttachmentError(err instanceof Error ? err.message : 'Erro no envio do arquivo.')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleAddLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAttachmentError(null)

    if (!stage || !newAttachmentName.trim() || !newAttachmentUrl.trim()) {
      setAttachmentError('Nome e URL do link são obrigatórios.')
      return
    }

    const res = await addStageAttachmentAction(projectId, stage.id, {
      name: newAttachmentName.trim(),
      url: newAttachmentUrl.trim(),
      size: 'Link Externo',
      is_visible_to_client: newAttachmentVisibleToClient,
    })

    if (res.success && res.attachment) {
      setAttachments((prev) => [...prev, res.attachment!])
      setNewAttachmentName('')
      setNewAttachmentUrl('')
      setNewAttachmentVisibleToClient(false)
      setShowAddAttachment(false)
    } else {
      setAttachmentError(res.error || 'Erro ao anexar link.')
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!stage) return
    const confirmed = await confirm({
      title: 'Remover Anexo',
      message: 'Tem certeza que deseja remover este anexo?',
      confirmText: 'Remover',
      cancelText: 'Cancelar',
      variant: 'danger',
    })

    if (confirmed) {
      setAttachments((prev) => prev.filter((att) => att.id !== attachmentId))
      await deleteStageAttachmentAction(projectId, stage.id, attachmentId)
    }
  }

  const handleSaveEditAttachment = async (attachmentId: string) => {
    const trimmed = editingAttachmentName.trim()
    if (!trimmed || !stage) return
    setSavingAttachmentId(attachmentId)

    const res = await editStageAttachmentAction(projectId, stage.id, attachmentId, trimmed)
    setSavingAttachmentId(null)

    if (res.success && res.attachment) {
      setAttachments((prev) => prev.map((att) => (att.id === attachmentId ? res.attachment! : att)))
      setEditingAttachmentId(null)
      setEditingAttachmentName('')
    } else {
      await showAlert({
        title: 'Erro ao editar anexo',
        message: res.error || 'Erro ao atualizar o nome do anexo.',
        variant: 'error',
      })
    }
  }

  const handleToggleAttachmentVisibility = async (attachment: StageAttachment) => {
    if (!stage) return
    const current = attachment.is_visible_to_client !== false
    const nextVal = !current

    const confirmed = await confirm({
      title: nextVal ? 'Exibir Anexo no Portal' : 'Ocultar Anexo do Portal',
      message: nextVal
        ? `Deseja liberar o anexo "${attachment.name}" para visualização no portal do cliente?`
        : `Deseja ocultar o anexo "${attachment.name}" do portal do cliente?`,
      description: nextVal
        ? 'O cliente poderá visualizar e baixar este arquivo na etapa de aprovação.'
        : 'Este arquivo passará a ser de uso interno e não ficará visível para o cliente.',
      confirmText: nextVal ? 'Liberar no Portal' : 'Ocultar Anexo',
      cancelText: 'Cancelar',
      variant: nextVal ? 'primary' : 'warning',
    })

    if (!confirmed) return

    setTogglingVisibilityId(attachment.id)
    const res = await toggleStageAttachmentVisibilityAction(projectId, stage.id, attachment.id, nextVal)
    setTogglingVisibilityId(null)

    if (res.success && res.attachment) {
      setAttachments((prev) => prev.map((att) => (att.id === attachment.id ? res.attachment! : att)))
    } else {
      await showAlert({
        title: 'Erro ao alterar visibilidade',
        message: res.error || 'Não foi possível alterar a visibilidade do anexo no portal.',
        variant: 'error',
      })
    }
  }

  // Subtasks Actions
  const handleCreateSubtaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newSubtaskName.trim()
    if (!trimmed || !stage) return

    setCreatingSubtask(true)
    const res = await createStageAction(projectId, {
      name: trimmed,
      assigned_to: newSubtaskAssignedTo || null,
      due_date: newSubtaskDueDate || null,
      parent_stage_id: stage.id,
      status: 'a_iniciar',
      is_client_approval_required: false,
    })
    setCreatingSubtask(false)

    if (res.success && res.stage) {
      const created = res.stage as TaskDetailData
      setAllStages((prev) => [...prev, created])
      setNewSubtaskName('')
      setNewSubtaskAssignedTo('')
      setNewSubtaskDueDate('')
      setShowAddSubtask(false)
    } else {
      await showAlert({
        title: 'Erro ao criar subtarefa',
        message: res.error || 'Não foi possível criar a subtarefa.',
        variant: 'error',
      })
    }
  }

  const handleUnlinkCurrentFromParent = async () => {
    if (!stage?.parent_stage_id) return
    const confirmed = await confirm({
      title: 'Desvincular da Tarefa Principal',
      message: `Deseja transformar a subtarefa "${formData.name || stage.name}" em uma tarefa principal independente?`,
      description: 'Ela passará a ser uma tarefa normal de primeiro nível no projeto.',
      confirmText: 'Desvincular',
      cancelText: 'Cancelar',
      variant: 'info',
    })

    if (!confirmed) return

    const res = await unlinkSubtaskAction(projectId, stage.id)
    if (res.success) {
      setStage((prev) => ({ ...prev, parent_stage_id: null }))
      setAllStages((prev) =>
        prev.map((s) => (s.id === stage.id ? { ...s, parent_stage_id: null } : s))
      )
    } else {
      await showAlert({
        title: 'Erro ao desvincular',
        message: res.error || 'Não foi possível desvincular a subtarefa.',
        variant: 'error',
      })
    }
  }

  const handleUnlinkChildSubtask = async (child: TaskDetailData) => {
    const confirmed = await confirm({
      title: 'Desvincular Subtarefa',
      message: `Deseja desvincular "${child.name}" desta tarefa?`,
      description: 'Ela se tornará uma tarefa independente de primeiro nível no projeto.',
      confirmText: 'Desvincular',
      cancelText: 'Cancelar',
      variant: 'info',
    })

    if (!confirmed) return

    setUnlinkingSubtaskId(child.id)
    const res = await unlinkSubtaskAction(projectId, child.id)
    setUnlinkingSubtaskId(null)

    if (res.success) {
      setAllStages((prev) =>
        prev.map((s) => (s.id === child.id ? { ...s, parent_stage_id: null } : s))
      )
    } else {
      await showAlert({
        title: 'Erro ao desvincular',
        message: res.error || 'Não foi possível desvincular a subtarefa.',
        variant: 'error',
      })
    }
  }

  // Helpers
  const getMemberName = (userId?: string | null) => {
    if (!userId) return null
    const member = members.find((m) => m.id === userId)
    return member ? member.name : null
  }

  const getFileIcon = (fileName: string, url: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    if (['pdf'].includes(ext)) return <FileText className="w-4 h-4 text-rose-600 shrink-0" />
    if (['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'].includes(ext))
      return <ImageIcon className="w-4 h-4 text-blue-600 shrink-0" />
    if (['dwg', 'dxf', 'rvt', 'ifc', 'skp'].includes(ext))
      return <File className="w-4 h-4 text-indigo-600 shrink-0" />
    if (url.startsWith('http') && !url.includes('supabase.co'))
      return <Link2 className="w-4 h-4 text-emerald-600 shrink-0" />
    return <Paperclip className="w-4 h-4 text-slate-500 shrink-0" />
  }

  return (
    <div className="space-y-6 antialiased pb-16">
      {/* Breadcrumb Global */}
      <BreadcrumbSetter
        items={[
          { label: 'Escritório' },
          { label: 'Projetos', href: '/app/projetos' },
          { label: project.title, href: `/app/projetos/${projectId}` },
          {
            label: `${stage.code ? `Tarefa ${stage.code}` : `Tarefa #${stage.stage_order}`} - ${formData.name || stage.name}`,
          },
        ]}
      />

      {/* Top Header & Actions Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        {/* Row 1 no Mobile / Lado Esquerdo no Desktop */}
        <div className="flex items-center justify-between md:justify-start gap-2 sm:gap-3 w-full md:w-auto">
          {/* Identificação e Navegação */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={handleBackToProject}
              className="h-9 w-9 sm:w-auto sm:px-3.5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs shrink-0"
              title="Voltar ao quadro do projeto"
              aria-label="Voltar ao Projeto"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Voltar ao Projeto</span>
            </button>

            <div className="h-5 w-px bg-slate-200 hidden sm:block shrink-0" />

            {/* Código da Tarefa */}
            <span className="h-9 inline-flex items-center px-2.5 font-mono text-xs font-bold rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 shrink-0">
              {stage.code ? `Tarefa ${stage.code}` : `Tarefa #${stage.stage_order}`}
            </span>

            {/* Badges visíveis inline no Desktop (md:) */}
            <div className="hidden md:flex items-center gap-2 shrink-0">
              {stage.parent_stage_id && (
                <span className="h-9 inline-flex items-center gap-1 font-mono text-xs font-bold px-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/80 shrink-0">
                  <GitFork className="w-3 h-3 rotate-180 text-indigo-600" /> Subtarefa
                </span>
              )}

              {/* Pill de Status Atual */}
              <span
                className={`h-9 inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold border transition-colors shrink-0 ${stageConfig.style.badge}`}
                style={getBadgeInlineStyle(stageConfig.style)}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${stageConfig.style.dot}`}
                  style={getDotInlineStyle(stageConfig.style)}
                />
                {stageConfig.name}
              </span>
            </div>
          </div>

          {/* Ações Rápidas no Mobile (< md) para manter 100% alinhado na Linha 1 */}
          <div className="flex md:hidden items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="h-9 w-9 p-0 inline-flex items-center justify-center text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="Copiar link direto para esta tarefa"
              aria-label="Copiar Link"
            >
              {copiedLink ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>

            {!readOnly && (
              <>
                <button
                  type="button"
                  onClick={handleDeleteCurrentStage}
                  disabled={deletingStage}
                  className="h-9 w-9 p-0 inline-flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/80 rounded-xl transition-colors cursor-pointer shrink-0 shadow-2xs"
                  title="Excluir esta tarefa"
                  aria-label="Excluir Tarefa"
                >
                  {deletingStage ? (
                    <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSaveDetails}
                  disabled={saving}
                  className={`h-9 px-3.5 inline-flex items-center justify-center gap-1.5 rounded-xl text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer shrink-0 ${isDirty
                    ? 'bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-500/25 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-900'
                    }`}
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : saveSuccess ? (
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{saveSuccess ? 'Salvo' : 'Salvar'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Linha 2 no Mobile (< md): Status e Subtarefa alinhados */}
        <div className="flex md:hidden items-center justify-between gap-2 pt-2.5 border-t border-slate-100 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {stage.parent_stage_id && (
              <span className="h-8 inline-flex items-center gap-1 font-mono text-xs font-bold px-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/80 shrink-0">
                <GitFork className="w-3 h-3 rotate-180 text-indigo-600" /> Subtarefa
              </span>
            )}

            <span
              className={`h-8 inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold border transition-colors shrink-0 ${stageConfig.style.badge}`}
              style={getBadgeInlineStyle(stageConfig.style)}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${stageConfig.style.dot}`}
                style={getDotInlineStyle(stageConfig.style)}
              />
              {stageConfig.name}
            </span>
          </div>

          {isDirty && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Não salvo
            </span>
          )}
        </div>

        {/* Lado Direito no Desktop (md:) */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          {isDirty && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Alterações não salvas
            </span>
          )}

          <button
            type="button"
            onClick={handleCopyLink}
            className="h-10 inline-flex items-center gap-1.5 px-3.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer shrink-0 shadow-2xs"
            title="Copiar link direto para esta tarefa"
          >
            {copiedLink ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
          </button>

          {!readOnly && (
            <>
              <button
                type="button"
                onClick={handleDeleteCurrentStage}
                disabled={deletingStage}
                className="h-10 w-10 p-0 inline-flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/80 rounded-xl transition-colors cursor-pointer shrink-0 shadow-2xs"
                title="Excluir esta tarefa"
              >
                {deletingStage ? (
                  <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                onClick={handleSaveDetails}
                disabled={saving}
                className={`h-10 inline-flex items-center gap-2 px-5 rounded-xl text-white text-sm font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer shrink-0 ${isDirty
                  ? 'bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-500/25 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-900'
                  }`}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saveSuccess ? (
                  <Check className="w-4 h-4 text-emerald-300" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saveSuccess ? 'Salvo com Sucesso!' : isDirty ? 'Salvar Alterações' : 'Salvar'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Breadcrumb de Ancestrais (se for subtarefa) */}
      {ancestors.length > 0 && (
        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 text-indigo-950 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-bold text-indigo-700 flex items-center gap-1.5">
              <GitFork className="w-4 h-4 rotate-180 text-indigo-600 shrink-0" />
              Subtarefa vinculada a:
            </span>
            {ancestors.map((anc, idx) => (
              <div key={anc.id} className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleNavigateToTask(anc.id)}
                  className="font-bold text-indigo-800 hover:text-indigo-950 hover:underline max-w-[260px] truncate cursor-pointer"
                  title={`Abrir tarefa pai: ${anc.code ? `${anc.code} - ` : ''}${anc.name}`}
                >
                  {anc.code ? `${anc.code} - ${anc.name}` : anc.name}
                </button>
                {idx < ancestors.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                )}
              </div>
            ))}
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={handleUnlinkCurrentFromParent}
              className="text-xs font-semibold text-indigo-700 hover:text-rose-600 bg-white/90 hover:bg-white px-3 py-1.5 rounded-xl border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
              title="Transformar esta subtarefa em tarefa independente de primeiro nível"
            >
              <Unlink className="w-3.5 h-3.5" />
              Desvincular da Principal
            </button>
          )}
        </div>
      )}

      {/* Banners Informativos de Status e Validação */}
      {isTaskFinalized && (
        <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 text-indigo-900 flex items-center gap-3 text-sm font-semibold shadow-2xs">
          <Flag className="w-5 h-5 text-indigo-600 shrink-0" />
          <span>
            Esta tarefa está na etapa <strong>Finalizada</strong> do fluxo de trabalho.
          </span>
        </div>
      )}

      {formData.is_client_approval_required && !isTaskFinalized && (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm shadow-2xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              Esta tarefa <strong>exige aprovação do cliente</strong> no portal para avançar à conclusão.
            </span>
          </div>
          {canOverrideApproval && !readOnly && (
            <button
              type="button"
              onClick={() => {
                setPendingTargetStatus(getFinalStage(workflowStages)?.id || 'concluido')
                setManualApprovalModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
            >
              <ShieldCheck className="w-4 h-4" /> Aprovar Manualmente
            </button>
          )}
        </div>
      )}

      {/* Layout Principal em 2 Colunas no Desktop (lg:grid-cols-12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ========================================================================= */}
        {/* COLUNA ESQUERDA: TODAS AS CONFIGURAÇÕES DA TAREFA (~62% / lg:col-span-7) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Card 1: Título e Escopo de Trabalho */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Título da Tarefa *
              </label>
              <input
                type="text"
                disabled={readOnly}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-base sm:text-lg font-bold text-slate-900 border border-slate-200 rounded-xl p-3.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white disabled:opacity-60"
                placeholder="Nome da etapa ou tarefa..."
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Descrição da Tarefa
              </label>
              <textarea
                rows={4}
                disabled={readOnly}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl p-3.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none bg-slate-50/50 hover:bg-white leading-relaxed disabled:opacity-60"
                placeholder="Detalhe o que deve ser produzido, referências, orientações e critérios de aprovação..."
              />
            </div>
          </div>

          {/* Card 2: Metadados & Cronograma com Nivelamento Rigoroso */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Parâmetros & Cronograma da Tarefa
              </h3>
              <span className="text-xs text-slate-400 font-medium">Campos alinhados e nivelados</span>
            </div>

            {/* Grid dos Campos - 3 Colunas Perfeitamente Niveladas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {/* LINHA 1 - COLUNA 1: Status da Tarefa */}
              <div className="space-y-1.5">
                <div className="min-h-[28px] flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Status da Tarefa</span>
                </div>
                <select
                  disabled={readOnly}
                  value={formData.status}
                  onChange={(e) => handleStatusSelectChange(e.target.value)}
                  className="w-full h-11 text-sm font-semibold bg-white border border-slate-200 rounded-xl px-3 text-slate-800 outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer disabled:opacity-60"
                >
                  {workflowStages.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* LINHA 1 - COLUNA 2: Responsável Interno */}
              <div className="space-y-1.5">
                <div className="min-h-[28px] flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Responsável Interno</span>
                </div>
                <select
                  disabled={readOnly}
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  className="w-full h-11 text-sm font-semibold bg-white border border-slate-200 rounded-xl px-3 text-slate-800 outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer disabled:opacity-60"
                >
                  <option value="">Não atribuído</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* LINHA 1 - COLUNA 3: Aprovação do Cliente */}
              <div className="space-y-1.5">
                <div className="min-h-[28px] flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Aprovação do Cliente</span>
                </div>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() =>
                    setFormData({
                      ...formData,
                      is_client_approval_required: !formData.is_client_approval_required,
                    })
                  }
                  className={`w-full h-11 text-sm font-semibold px-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer disabled:opacity-60 ${formData.is_client_approval_required
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/60'
                    }`}
                >
                  <span className="truncate">
                    {formData.is_client_approval_required ? 'Exige Aprovação' : 'Interno (Sem Aprovação)'}
                  </span>
                  {formData.is_client_approval_required ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="text-xs text-slate-400 shrink-0">Opcional</span>
                  )}
                </button>
              </div>

              {/* LINHA 2 - COLUNA 1: Data de Início */}
              <div className="space-y-1.5">
                <div className="min-h-[28px] flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Data de Início</span>
                </div>
                <input
                  type="date"
                  disabled={readOnly}
                  value={formData.start_date}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full h-11 text-sm font-semibold bg-white border border-slate-200 rounded-xl px-3 text-slate-800 outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
                />
              </div>

              {/* LINHA 2 - COLUNA 2: Prazo de Entrega */}
              <div className="space-y-1.5">
                <div className="min-h-[28px] flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Prazo de Entrega</span>
                </div>
                <input
                  type="date"
                  disabled={readOnly}
                  value={formData.due_date}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                  className="w-full h-11 text-sm font-semibold bg-white border border-slate-200 rounded-xl px-3 text-slate-800 outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
                />
              </div>

              {/* LINHA 2 - COLUNA 3: Duração Sugerida com Toggle Alinhado no Topo */}
              <div className="space-y-1.5">
                <div className="min-h-[28px] flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Duração</span>
                  </span>
                  <DurationTypeToggle
                    value={formData.duration_type}
                    onChange={handleDurationTypeChange}
                    size="sm"
                    disabled={readOnly}
                  />
                </div>
                <div className="relative h-11">
                  <input
                    type="number"
                    min={1}
                    disabled={readOnly}
                    value={formData.duration_days}
                    onChange={(e) => handleDurationChange(e.target.value)}
                    placeholder="Ex: 5"
                    className="w-full h-11 text-sm font-mono font-bold bg-white border border-slate-200 rounded-xl pl-3 pr-24 text-slate-800 outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none select-none">
                    {formData.duration_type === 'uteis' ? 'dias úteis' : 'dias corridos'}
                  </span>
                </div>
              </div>
            </div>

            {/* Aviso sobre contagem de dias úteis */}
            {formData.duration_type === 'uteis' && (
              <p className="text-xs text-amber-800 bg-amber-50/80 px-3 py-2 rounded-xl border border-amber-200 flex items-center gap-2 animate-in fade-in">
                <span>💼</span>
                <span>
                  <strong>Modo Dias Úteis ativado:</strong> O cálculo de prazo desconsidera sábados, domingos e feriados nacionais brasileiros.
                </span>
              </p>
            )}

            {/* Barra de Status do Cronograma */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500">Status do Prazo:</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold border ${timelineStatus.badgeBg} ${timelineStatus.badgeColor} ${timelineStatus.badgeBorder}`}
                >
                  {timelineStatus.type === 'extrapolou' && (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  )}
                  {timelineStatus.type === 'hoje' && (
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  )}
                  {timelineStatus.type === 'amanha' && (
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  )}
                  {timelineStatus.type === 'curto' && (
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  )}
                  {timelineStatus.type === 'longo' && (
                    <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  )}
                  {timelineStatus.type === 'concluido' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  )}
                  {timelineStatus.label}
                </span>
              </div>

              {formData.duration_days && Number(formData.duration_days) > 0 && (
                <span className="text-slate-500 font-medium">
                  Intervalo configurado:{' '}
                  <strong className="text-slate-800 font-mono">
                    {formData.duration_days}{' '}
                    {formData.duration_type === 'uteis' ? 'dias úteis' : 'dias corridos'}
                  </strong>
                </span>
              )}
            </div>
          </div>

          {/* Card 3: Subtarefas Vinculadas */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <GitFork className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-900">Subtarefas Vinculadas</h4>
                <span className="text-xs text-slate-400 font-mono">({subtasks.length})</span>
              </div>

              <div className="flex items-center gap-3">
                {subtasks.length > 0 && (
                  <span className="text-xs text-slate-500 font-medium">
                    Progresso:{' '}
                    <strong className="text-indigo-600 font-mono">
                      {completedSubtasksCount}/{subtasks.length} ({subtaskProgressPercent}%)
                    </strong>
                  </span>
                )}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => setShowAddSubtask(!showAddSubtask)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Subtarefa</span>
                  </button>
                )}
              </div>
            </div>

            {/* Formulário de Nova Subtarefa */}
            {showAddSubtask && !readOnly && (
              <form
                onSubmit={handleCreateSubtaskSubmit}
                className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200/80 space-y-3 animate-in fade-in"
              >
                <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar Nova Subtarefa</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6">
                    <input
                      type="text"
                      required
                      value={newSubtaskName}
                      onChange={(e) => setNewSubtaskName(e.target.value)}
                      placeholder="Título da subtarefa..."
                      className="w-full text-sm border border-indigo-200 rounded-xl p-2.5 bg-white outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <select
                      value={newSubtaskAssignedTo}
                      onChange={(e) => setNewSubtaskAssignedTo(e.target.value)}
                      className="w-full text-xs border border-indigo-200 rounded-xl p-2.5 bg-white outline-hidden text-slate-700"
                    >
                      <option value="">Responsável...</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="date"
                      value={newSubtaskDueDate}
                      onChange={(e) => setNewSubtaskDueDate(e.target.value)}
                      className="w-full text-xs border border-indigo-200 rounded-xl p-2.5 bg-white outline-hidden text-slate-700"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddSubtask(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingSubtask || !newSubtaskName.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                  >
                    {creatingSubtask && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Criar Subtarefa</span>
                  </button>
                </div>
              </form>
            )}

            {/* Lista de Subtarefas */}
            {subtasks.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-2">
                Nenhuma subtarefa vinculada a esta tarefa principal.
              </p>
            ) : (
              <div className="space-y-2">
                {subtasks.map((st) => {
                  const cfg = workflowStages.find((ws) => ws.id === st.status)
                  const isDone = st.status === 'concluido' || Boolean(cfg?.is_final_stage)
                  return (
                    <div
                      key={st.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 hover:border-indigo-300 bg-slate-50/60 hover:bg-white transition-all group"
                    >
                      <button
                        type="button"
                        onClick={() => handleNavigateToTask(st.id)}
                        className="flex items-center gap-3 text-left flex-1 min-w-0 cursor-pointer"
                      >
                        <div
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ${isDone
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-300 bg-white'
                            }`}
                        >
                          {isDone && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div className="truncate space-y-0.5">
                          <span
                            className={`text-sm font-bold block truncate group-hover:text-indigo-600 transition-colors ${isDone ? 'line-through text-slate-400' : 'text-slate-800'
                              }`}
                          >
                            {st.code ? `[${st.code}] ` : ''}
                            {st.name}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            {st.assigned_to && (
                              <span>👤 {getMemberName(st.assigned_to) || 'Membro'}</span>
                            )}
                            {st.due_date && <span>📅 {formatDateBR(st.due_date)}</span>}
                          </div>
                        </div>
                      </button>

                      {!readOnly && (
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleUnlinkChildSubtask(st)}
                            disabled={unlinkingSubtaskId === st.id}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Desvincular e tornar tarefa avulsa"
                          >
                            {unlinkingSubtaskId === st.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Unlink className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Card 4: Checklist Operacional */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-bold text-slate-900">Checklist Operacional</h4>
                <span className="text-xs text-slate-400 font-mono">
                  ({checklist.filter((i) => i.completed).length}/{checklist.length})
                </span>
              </div>
            </div>

            {/* Input de Adição Rápida */}
            {!readOnly && (
              <form onSubmit={handleAddChecklistItem} className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <input
                    type="text"
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    placeholder="Adicionar novo item ao checklist..."
                    className="flex-1 min-w-[200px] text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50/50 focus:bg-white outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <input
                    type="date"
                    value={newChecklistDueDate}
                    onChange={(e) => setNewChecklistDueDate(e.target.value)}
                    className="text-xs border border-slate-200 rounded-xl px-2.5 py-2.5 bg-slate-50/50 text-slate-700 outline-hidden"
                    title="Data de entrega do item"
                  />
                  <select
                    value={newChecklistAssignedTo}
                    onChange={(e) => setNewChecklistAssignedTo(e.target.value)}
                    className="text-xs border border-slate-200 rounded-xl px-2.5 py-2.5 bg-slate-50/50 text-slate-700 outline-hidden"
                  >
                    <option value="">Responsável...</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={!newChecklistText.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </button>
                </div>
              </form>
            )}

            {/* Lista de Itens do Checklist */}
            {checklist.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-2">
                Nenhum item adicionado ao checklist desta tarefa.
              </p>
            ) : (
              <div className="space-y-2">
                {checklist.map((item) => {
                  const isEditing = editingChecklistItemId === item.id
                  if (isEditing) {
                    return (
                      <div
                        key={item.id}
                        className="p-3 bg-white rounded-xl border border-blue-400 space-y-2"
                      >
                        <input
                          type="text"
                          value={editingChecklistText}
                          onChange={(e) => setEditingChecklistText(e.target.value)}
                          className="w-full text-sm font-medium border border-slate-200 rounded-lg p-2"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEditChecklist}
                            className="px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditChecklist(item.id)}
                            disabled={savingChecklistItemId === item.id || !editingChecklistText.trim()}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white transition-all group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          disabled={readOnly}
                          checked={item.completed}
                          onChange={() => handleToggleChecklist(item.id, item.completed)}
                          className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span
                          className={`text-sm font-medium truncate ${item.completed ? 'line-through text-slate-400' : 'text-slate-800'
                            }`}
                        >
                          {item.text}
                        </span>
                        {item.due_date && (
                          <span className="text-xs text-slate-400 font-mono">
                            📅 {formatDateBR(item.due_date)}
                          </span>
                        )}
                        {item.assigned_to && (
                          <span className="text-xs text-slate-400">
                            👤 {getMemberName(item.assigned_to)}
                          </span>
                        )}
                      </div>

                      {!readOnly && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleStartEditChecklist(item)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Editar item"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteChecklistItem(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remover item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Card 5: Arquivos e Pranchas Anexadas */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-900">Arquivos e Pranchas Anexadas</h4>
                <span className="text-xs text-slate-400 font-mono">({attachments.length})</span>
              </div>

              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setShowAddAttachment(!showAddAttachment)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Anexar Arquivo / Link</span>
                </button>
              )}
            </div>

            {/* Formulário de Adição de Anexo */}
            {showAddAttachment && !readOnly && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <button
                    type="button"
                    onClick={() => setAttachmentMode('file')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${attachmentMode === 'file'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    Arquivo do Computador
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttachmentMode('link')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${attachmentMode === 'link'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    Link Externo (Drive, Figma, BIM)
                  </button>
                </div>

                {attachmentError && (
                  <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                    {attachmentError}
                  </p>
                )}

                {attachmentMode === 'file' ? (
                  <form onSubmit={handleUploadFileSubmit} className="space-y-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={newAttachmentName}
                      onChange={(e) => setNewAttachmentName(e.target.value)}
                      placeholder="Nome de exibição do arquivo (opcional)..."
                      className="w-full text-sm border border-slate-200 rounded-xl p-2.5 bg-white outline-hidden focus:border-blue-500"
                    />

                    {/* Toggle Visibilidade Portal */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-blue-600" />
                        Exibir para o cliente no portal de aprovação
                      </span>
                      <button
                        type="button"
                        onClick={() => setNewAttachmentVisibleToClient(!newAttachmentVisibleToClient)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${newAttachmentVisibleToClient ? 'bg-blue-600' : 'bg-slate-300'
                          }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${newAttachmentVisibleToClient ? 'translate-x-4' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddAttachment(false)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={uploadingFile || !selectedFile}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                      >
                        {uploadingFile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Enviar Arquivo</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleAddLinkSubmit} className="space-y-3">
                    <input
                      type="text"
                      required
                      value={newAttachmentName}
                      onChange={(e) => setNewAttachmentName(e.target.value)}
                      placeholder="Nome do anexo (ex: Modelo 3D / Planta Baixa)..."
                      className="w-full text-sm border border-slate-200 rounded-xl p-2.5 bg-white outline-hidden focus:border-blue-500"
                    />
                    <input
                      type="url"
                      required
                      value={newAttachmentUrl}
                      onChange={(e) => setNewAttachmentUrl(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="w-full text-sm border border-slate-200 rounded-xl p-2.5 bg-white outline-hidden focus:border-blue-500"
                    />

                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-blue-600" />
                        Exibir para o cliente no portal de aprovação
                      </span>
                      <button
                        type="button"
                        onClick={() => setNewAttachmentVisibleToClient(!newAttachmentVisibleToClient)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${newAttachmentVisibleToClient ? 'bg-blue-600' : 'bg-slate-300'
                          }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${newAttachmentVisibleToClient ? 'translate-x-4' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddAttachment(false)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={!newAttachmentName.trim() || !newAttachmentUrl.trim()}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                      >
                        Salvar Link
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Grid de Anexos */}
            {attachments.length === 0 && !showAddAttachment ? (
              <p className="text-sm text-slate-400 italic py-2">
                Nenhum arquivo ou prancha anexada a esta tarefa.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachments.map((att) => {
                  const isEditing = editingAttachmentId === att.id
                  const isVisibleToClient = att.is_visible_to_client !== false

                  if (isEditing) {
                    return (
                      <div
                        key={att.id}
                        className="col-span-1 sm:col-span-2 p-3 bg-white rounded-xl border border-blue-400 space-y-2"
                      >
                        <input
                          type="text"
                          value={editingAttachmentName}
                          onChange={(e) => setEditingAttachmentName(e.target.value)}
                          className="w-full text-sm font-medium border border-slate-200 rounded-lg p-2"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingAttachmentId(null)}
                            className="px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditAttachment(att.id)}
                            disabled={savingAttachmentId === att.id || !editingAttachmentName.trim()}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-3.5 bg-slate-50/70 hover:bg-white rounded-xl border border-slate-200/80 hover:border-blue-300 transition-all group"
                    >
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 flex-1 min-w-0"
                        title={att.name}
                      >
                        <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs shrink-0">
                          {getFileIcon(att.name, att.url)}
                        </div>
                        <div className="truncate space-y-0.5">
                          <span className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors block truncate">
                            {att.name}
                          </span>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <span>{att.size || 'Arquivo'}</span>
                            <span>•</span>
                            {isVisibleToClient ? (
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
                                <Eye className="w-3 h-3" /> Portal
                              </span>
                            ) : (
                              <span className="font-medium text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded border border-slate-300 inline-flex items-center gap-1">
                                <EyeOff className="w-3 h-3" /> Interno
                              </span>
                            )}
                          </div>
                        </div>
                      </a>

                      {!readOnly && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleAttachmentVisibility(att)}
                            disabled={togglingVisibilityId === att.id}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isVisibleToClient
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
                              }`}
                            title={
                              isVisibleToClient
                                ? 'Visível no Portal (clique para ocultar)'
                                : 'Oculto no Portal (clique para exibir)'
                            }
                          >
                            {togglingVisibilityId === att.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isVisibleToClient ? (
                              <Eye className="w-3.5 h-3.5" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingAttachmentId(att.id)
                              setEditingAttachmentName(att.name)
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Editar nome"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(att.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remover anexo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUNA DIREITA: COMENTÁRIOS & HISTÓRICO DEDICADO (~38% / lg:col-span-5) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5 sticky top-6">
            {/* Header da Coluna */}
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Comentários & Histórico</h3>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">
                {comments.length}
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed -mt-2">
              Espaço dedicado para alinhamentos da equipe interna, decisões de projeto e auditoria de validações do cliente.
            </p>

            {/* Formulário de Adicionar Comentário */}
            {!readOnly && (
              <form onSubmit={handleAddComment} className="space-y-3">
                <textarea
                  rows={3}
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Escreva um comentário ou alinhamento para a equipe..."
                  className="w-full text-sm border border-slate-200 rounded-xl p-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none bg-slate-50/50 focus:bg-white leading-relaxed"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!newCommentText.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" /> Comentar
                  </button>
                </div>
              </form>
            )}

            {/* Feed de Comentários e Histórico com Altura Ampla */}
            <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-xl bg-slate-50/60 border border-dashed border-slate-200 space-y-2">
                  <MessageSquare className="w-6 h-6 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-400">
                    Nenhum comentário registrado ainda. Use este espaço para alinhar a equipe e registrar decisões.
                  </p>
                </div>
              ) : (
                comments.map((cmt) => {
                  const isEditing = editingCommentId === cmt.id
                  const isAudit =
                    cmt.text.includes('[Aprovação Manual]') ||
                    cmt.text.includes('[Validação do Cliente]') ||
                    cmt.user_id === 'portal-client'

                  return (
                    <div
                      key={cmt.id}
                      className={`p-3.5 rounded-xl border space-y-2 transition-all group ${isAudit
                        ? 'bg-emerald-50/70 border-emerald-200/90 shadow-2xs'
                        : 'bg-slate-50/80 border-slate-200/70 hover:border-slate-300'
                        }`}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`font-bold ${isAudit ? 'text-emerald-950 flex items-center gap-1' : 'text-slate-800'
                              }`}
                          >
                            {isAudit && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                            {cmt.user_name}
                          </span>
                          {isAudit && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded">
                              Auditoria
                            </span>
                          )}
                          <span>•</span>
                          <span>{formatDateTimeBR(cmt.created_at)}</span>
                          {cmt.updated_at && (
                            <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 rounded font-medium">
                              Editado
                            </span>
                          )}
                        </div>

                        {!isEditing && !isAudit && !readOnly && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleStartEditComment(cmt)}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Editar comentário"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(cmt.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Excluir comentário"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2 pt-1">
                          <textarea
                            rows={2}
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            className="w-full text-sm border border-blue-400 rounded-lg p-2.5 bg-white outline-hidden focus:ring-2 focus:ring-blue-500/20 resize-none leading-relaxed"
                            autoFocus
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={handleCancelEditComment}
                              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditComment(cmt.id)}
                              disabled={savingCommentId === cmt.id || !editingCommentText.trim()}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs disabled:opacity-50 cursor-pointer"
                            >
                              {savingCommentId === cmt.id && <Loader2 className="w-3 h-3 animate-spin" />}
                              Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p
                          className={`text-sm whitespace-pre-wrap leading-relaxed ${isAudit ? 'text-emerald-950 font-medium' : 'text-slate-700'
                            }`}
                        >
                          {cmt.text}
                        </p>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Exclusão de Tarefa com Subtarefas */}
      {subtaskDeleteModalOpen && (
        <div className="fixed inset-0 z-60 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Excluir Tarefa com Subtarefas</h3>
                <p className="text-xs text-slate-500 mt-1">
                  A tarefa {stage?.code ? `[${stage.code}] ` : ''}
                  <strong>&quot;{formData.name || stage?.name}&quot;</strong> possui{' '}
                  <strong>{subtasks.length} subtarefa(s) vinculada(s)</strong>. Como deseja prosseguir?
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 max-h-36 overflow-y-auto space-y-1.5 text-xs text-slate-600">
              <span className="font-bold text-slate-700 block mb-1">Subtarefas vinculadas:</span>
              {subtasks.map((s) => (
                <div key={s.id} className="flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                  {s.code && (
                    <span className="font-mono text-[10px] text-slate-400 font-semibold">
                      {s.code}
                    </span>
                  )}
                  <span className="truncate font-medium text-slate-800">{s.name}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmDeleteWithSubtasks('cascade')}
                disabled={deletingStage}
                className="w-full p-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4 text-rose-600" /> Excluir Tudo (Tarefa e {subtasks.length}{' '}
                    Subtarefas)
                  </span>
                  {deletingStage && <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />}
                </div>
                <p className="text-[11px] text-rose-600/80 mt-1">
                  Move a tarefa principal e todas as suas subtarefas filhas para o histórico de tarefas excluídas.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleConfirmDeleteWithSubtasks('unlink')}
                disabled={deletingStage}
                className="w-full p-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                    <Unlink className="w-4 h-4 text-blue-600" /> Desvincular e Manter Subtarefas
                  </span>
                  {deletingStage && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />}
                </div>
                <p className="text-[11px] text-blue-600/80 mt-1">
                  Exclui apenas a tarefa principal. As subtarefas tornam-se tarefas independentes no projeto.
                </p>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSubtaskDeleteModalOpen(false)}
                disabled={deletingStage}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Aprovação Manual com Justificativa */}
      <ManualApprovalModal
        isOpen={manualApprovalModalOpen}
        onClose={() => setManualApprovalModalOpen(false)}
        taskTitle={formData.name || stage?.name || 'Tarefa'}
        onConfirm={handleConfirmManualApproval}
        isSubmitting={submittingManualApproval}
      />
    </div>
  )
}
