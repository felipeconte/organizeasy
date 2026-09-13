'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  Loader2,
  Paperclip,
  ExternalLink,
  Calendar,
  Check,
  AlertCircle,
  User,
  ShieldCheck,
  Send,
  Mail,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react'
import {
  submitClientApprovalAction,
  sendStageApprovalOtpAction,
} from '@/lib/actions/portal'
import { formatDateRangeBR } from '@/lib/date-utils'
import {
  WorkflowStage,
  STAGE_COLOR_CONFIG,
  getStageConfig,
  DEFAULT_WORKFLOW_STAGES,
} from '@/lib/workflow-stages'

export interface PortalData {
  project: {
    id: string
    code: string
    title: string
    description: string | null
    client_name: string
    client_email?: string | null
    area_sqm: number | null
    deadline: string | null
    status: string
  }
  clients?: Array<{
    id: string
    name: string
    email: string | null
    phone: string | null
    person_type: string
    portal_token?: string | null
  }>
  organization: {
    name: string
    logo_url: string | null
    cau_caubr: string | null
    phone: string | null
    email: string | null
  }
  stages: Array<{
    id: string
    name: string
    description: string | null
    stage_order: number
    status: string
    progress_percent: number
    start_date: string | null
    due_date: string | null
    is_client_approval_required: boolean
    is_locked_for_client: boolean
    attachments?: Array<{ id: string; name: string; url: string; size?: string }>
    approvalProgress?: {
      totalRequired: number
      currentApprovedCount: number
      isFullyApproved: boolean
      approvedClients: Array<{ clientId: string | null; name: string; approvedAt: string }>
    }
  }>
  workflowStages?: WorkflowStage[]
}

export interface PortalClientProps {
  token: string
  data: PortalData
}

export default function PortalClient({
  token,
  data,
}: PortalClientProps) {
  const { project, organization } = data
  const workflowStages = data.workflowStages && data.workflowStages.length > 0
    ? data.workflowStages
    : DEFAULT_WORKFLOW_STAGES

  const clientApprovalStage = useMemo(() => {
    return workflowStages.find((s) => s.is_client_approval_stage === true) || null
  }, [workflowStages])

  // Filtra APENAS etapas que exigem validação do cliente
  const approvalStages = useMemo(() => {
    return (data.stages || [])
      .filter((s) => s.is_client_approval_required !== false)
      .sort((a, b) => a.stage_order - b.stage_order)
  }, [data.stages])

  const projectClients = useMemo(() => {
    if (data.clients && data.clients.length > 0) return data.clients
    return [
      {
        id: 'default-client',
        name: project.client_name || 'Cliente',
        email: project.client_email || null,
        phone: null,
        person_type: 'PF',
        portal_token: null,
      },
    ]
  }, [data.clients, project.client_name, project.client_email])

  // Estados do modal de validação (Aprovação / Solicitação de Ajustes)
  const [selectedStage, setSelectedStage] = useState<PortalData['stages'][0] | null>(null)
  const [modalAction, setModalAction] = useState<'approved' | 'changes_requested' | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [feedbackText, setFeedbackText] = useState('')

  // Estados do fluxo OTP
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [submittingApproval, setSubmittingApproval] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Atualiza cliente selecionado ao abrir modal
  const openActionModal = (stage: PortalData['stages'][0], action: 'approved' | 'changes_requested') => {
    setSelectedStage(stage)
    setModalAction(action)
    setFeedbackText('')
    setOtpSent(false)
    setOtpCode('')
    setMaskedEmail(null)
    setErrorMessage(null)

    // Identifica o primeiro cliente pendente de aprovação
    const approvedIds = new Set((stage.approvalProgress?.approvedClients || []).map((a) => a.clientId))
    const firstPending = projectClients.find((c) => !approvedIds.has(c.id) && Boolean(c.email)) || projectClients[0]
    setSelectedClientId(firstPending?.id || '')
  }

  // Timer de cooldown de reenvio de OTP
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleSendOtp = async () => {
    if (!selectedStage || !modalAction || !selectedClientId) return
    const clientObj = projectClients.find((c) => c.id === selectedClientId)
    if (!clientObj?.email) {
      setErrorMessage('O cliente selecionado não possui um e-mail cadastrado para receber o código.')
      return
    }

    setSendingOtp(true)
    setErrorMessage(null)

    const res = await sendStageApprovalOtpAction(token, selectedStage.id, selectedClientId, modalAction)

    setSendingOtp(false)
    if (res.success) {
      setOtpSent(true)
      setMaskedEmail(res.maskedEmail || clientObj.email)
      setResendCooldown(60)
    } else {
      setErrorMessage(res.error || 'Falha ao enviar código de confirmação.')
    }
  }

  const handleConfirmApproval = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStage || !modalAction || !selectedClientId) return
    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMessage('Por favor, informe o código de confirmação de 6 dígitos.')
      return
    }

    setSubmittingApproval(true)
    setErrorMessage(null)

    const formData = new FormData()
    formData.append('clientId', selectedClientId)
    formData.append('otpCode', otpCode.trim())
    formData.append('feedback', feedbackText)

    const res = await submitClientApprovalAction(token, selectedStage.id, modalAction, formData)
    setSubmittingApproval(false)

    if (res.error) {
      setErrorMessage(res.error)
    } else {
      const actionDesc = modalAction === 'approved'
        ? (res.isFullyApproved
            ? `Etapa "${selectedStage.name}" aprovada com sucesso! Todas as validações foram concluídas.`
            : `Sua aprovação para "${selectedStage.name}" foi registrada com sucesso! Aguardando aprovação dos demais clientes.`)
        : `Solicitação de ajustes para "${selectedStage.name}" enviada para o escritório de arquitetura!`

      setFeedbackSuccess(actionDesc)

      // Atualiza status localmente
      const clientObj = projectClients.find((c) => c.id === selectedClientId)
      if (modalAction === 'approved') {
        if (res.isFullyApproved) {
          selectedStage.status = 'concluido'
          selectedStage.progress_percent = 100
        }
        if (selectedStage.approvalProgress && clientObj) {
          selectedStage.approvalProgress.currentApprovedCount += 1
          selectedStage.approvalProgress.approvedClients.push({
            clientId: clientObj.id,
            name: clientObj.name,
            approvedAt: new Date().toISOString(),
          })
        }
      } else {
        selectedStage.status = 'em_producao'
      }

      setModalAction(null)
      setSelectedStage(null)
    }
  }

  const completedCount = approvalStages.filter((s) => s.status === 'concluido' || s.status === 'aprovado').length
  const totalCount = approvalStages.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col antialiased">
      {/* Header do Escritório */}
      <header className="bg-white border-b border-slate-200/80 sticky top-10 sm:top-11 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {organization.logo_url ? (
              <img
                src={organization.logo_url}
                alt={organization.name}
                className="h-10 w-10 rounded-xl object-contain border border-slate-200 bg-white p-1"
              />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
            )}
            <div>
              <span className="text-sm font-bold text-slate-900 block">{organization.name}</span>
              <span className="text-xs text-slate-500">
                {organization.cau_caubr ? `CAU: ${organization.cau_caubr}` : 'Portal de Acompanhamento & Aprovações'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 flex-1 w-full">
        {/* Alerta de Sucesso */}
        {feedbackSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{feedbackSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackSuccess(null)}
              className="text-emerald-600 hover:text-emerald-800 text-xs font-bold ml-3 cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Banner do Projeto */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-mono text-xs font-bold border border-blue-100">
                  {project.code}
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {project.title}
                </h1>
              </div>
              {project.area_sqm && (
                <p className="text-xs text-slate-500">
                  Área: <strong className="text-slate-700 font-semibold">{project.area_sqm} m²</strong>
                </p>
              )}
            </div>

            {/* Progresso Geral */}
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 self-start sm:self-auto">
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Progresso</span>
                <span className="text-base font-bold text-slate-900 font-mono">{progressPercent}%</span>
              </div>
              <div className="w-24 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* LINHA DO TEMPO DE ETAPAS */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Linha do Tempo de Aprovações</h2>
                <p className="text-xs text-slate-500">Etapas do projeto que necessitam da sua validação</p>
              </div>
            </div>
          </div>

          {approvalStages.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <p className="text-sm font-semibold text-slate-600">Nenhuma etapa com aprovação necessária no momento.</p>
              <p className="text-xs text-slate-400">Quando a equipe solicitar a validação de uma prancha ou etapa, ela aparecerá aqui.</p>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
              {approvalStages.map((st, index) => {
                const stepNumber = index + 1
                const stageConfig = getStageConfig(st.status, workflowStages)
                const colStyle = STAGE_COLOR_CONFIG[stageConfig.color] || STAGE_COLOR_CONFIG.blue
                const isApproved = st.status === 'concluido' || stageConfig.id === 'concluido' || stageConfig.id === 'aprovado'
                const isPendingApproval = Boolean(clientApprovalStage && st.status === clientApprovalStage.id)
                const hasDates = !!(st.start_date || st.due_date)

                return (
                  <div key={st.id} className="relative group">
                    {/* Timeline Node Marker */}
                    <div
                      className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isApproved
                          ? 'bg-emerald-500 text-white ring-4 ring-emerald-100 shadow-xs'
                          : isPendingApproval
                            ? 'bg-amber-500 text-white ring-4 ring-amber-100 shadow-xs animate-pulse'
                            : `${colStyle.badge} ring-4 ring-slate-100 shadow-xs`
                      }`}
                    >
                      {isApproved ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        <span className="text-[11px] font-mono font-bold">{stepNumber}</span>
                      )}
                    </div>

                    {/* Timeline Card */}
                    <div
                      className={`p-5 sm:p-6 rounded-2xl border transition-all space-y-4 ${
                        isPendingApproval
                          ? 'bg-amber-50/40 border-amber-300/90 shadow-md ring-2 ring-amber-500/10'
                          : isApproved
                            ? 'bg-emerald-50/20 border-emerald-200/80 hover:border-emerald-300 shadow-xs'
                            : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      {/* Top Row: Task Name & Dynamic Status Badge */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                          {st.name}
                        </h3>

                        <div>
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${colStyle.badge}`}
                          >
                            <span className={`w-2 h-2 rounded-full ${colStyle.dot}`} />
                            {stageConfig.name}
                          </span>
                        </div>
                      </div>

                      {/* Datas Previstas */}
                      {hasDates && (
                        <div className="inline-flex items-center gap-2 text-xs text-slate-600 font-medium bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono">{formatDateRangeBR(st.start_date, st.due_date)}</span>
                        </div>
                      )}

                      {/* Descrição */}
                      {st.description && (
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                          {st.description}
                        </p>
                      )}

                      {/* Anexos e Pranchas para Validação */}
                      {st.attachments && st.attachments.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Paperclip className="w-3.5 h-3.5" /> Arquivos & Pranchas para Validação ({st.attachments.length})
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {st.attachments.map((att) => (
                              <a
                                key={att.id}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80 hover:border-blue-300 transition-all text-xs group/item"
                              >
                                <span className="font-semibold text-slate-800 group-hover/item:text-blue-700 truncate mr-2">
                                  {att.name}
                                </span>
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover/item:text-blue-600 shrink-0" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Status de Aprovações Colegiadas */}
                      {st.approvalProgress && st.approvalProgress.totalRequired > 1 && (
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                          <div className="flex items-center justify-between font-bold text-slate-700">
                            <span>Progresso das Aprovações do Projeto:</span>
                            <span className="font-mono">
                              {st.approvalProgress.currentApprovedCount} de {st.approvalProgress.totalRequired} validadas
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {projectClients.map((c) => {
                              const hasApproved = (st.approvalProgress?.approvedClients || []).some(
                                (a) => a.clientId === c.id
                              )
                              return (
                                <span
                                  key={c.id}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                                    hasApproved
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : 'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}
                                >
                                  {hasApproved ? (
                                    <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                  ) : (
                                    <Clock className="w-3 h-3 text-amber-600" />
                                  )}
                                  {c.name}: {hasApproved ? 'Aprovado' : 'Pendente'}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Solicitação de Aprovação */}
                      {isPendingApproval && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-amber-200/90 shadow-xs space-y-4">
                          <div className="flex items-center gap-2.5 text-amber-900 font-bold text-sm">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Solicitação de Validação do Cliente</span>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed">
                            Esta etapa foi finalizada pela equipe de arquitetura e está pronta para sua validação.
                            {st.approvalProgress && st.approvalProgress.totalRequired > 1 && (
                              <span className="block mt-1 text-amber-800 font-medium">
                                Para concluir a etapa, todos os clientes vinculados ao projeto deverão aprovar com o código de confirmação recebido por e-mail.
                              </span>
                            )}
                          </p>

                          <div className="flex items-center gap-3 flex-wrap pt-1">
                            <button
                              type="button"
                              onClick={() => openActionModal(st, 'approved')}
                              className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shadow-emerald-500/20"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" /> Aprovar Etapa
                            </button>

                            <button
                              type="button"
                              onClick={() => openActionModal(st, 'changes_requested')}
                              className="py-2.5 px-4 rounded-xl bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold transition-all cursor-pointer"
                            >
                              Solicitar Ajustes
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* MODAL DE APROVAÇÃO EM 2 PASSOS COM OTP */}
      {selectedStage && modalAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shadow-xs shrink-0 ${
                    modalAction === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {modalAction === 'approved' ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 leading-snug">
                    {modalAction === 'approved' ? 'Confirmar Aprovação' : 'Solicitar Ajustes'}
                  </h4>
                  <p className="text-xs text-slate-500 truncate max-w-xs">{selectedStage.name}</p>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* PASSO 1: SELEÇÃO DE QUEM ESTÁ APROVANDO */}
            {!otpSent ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Selecione quem está validando esta etapa:
                  </label>

                  <div className="space-y-2">
                    {projectClients.map((client) => {
                      const isAlreadyApproved = (selectedStage.approvalProgress?.approvedClients || []).some(
                        (a) => a.clientId === client.id
                      )
                      const isSelected = selectedClientId === client.id
                      const hasEmail = Boolean(client.email)

                      return (
                        <div
                          key={client.id}
                          onClick={() => {
                            if (!isAlreadyApproved && hasEmail) {
                              setSelectedClientId(client.id)
                            }
                          }}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isAlreadyApproved
                              ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                              : isSelected
                                ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/10'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{client.name}</p>
                              <p className="text-[11px] text-slate-500 truncate font-mono">
                                {client.email || 'Sem e-mail cadastrado'}
                              </p>
                            </div>
                          </div>

                          {isAlreadyApproved ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                              <Check className="w-3 h-3 stroke-[3]" /> Já aprovou
                            </span>
                          ) : !hasEmail ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 shrink-0">
                              E-mail necessário
                            </span>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Campo de Feedback / Observações */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    {modalAction === 'approved' ? 'Observações adicionais (opcional)' : 'Descreva os ajustes necessários *'}
                  </label>
                  <textarea
                    rows={3}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder={
                      modalAction === 'approved'
                        ? 'Ex: Projeto aprovado conforme pranchas apresentadas.'
                        : 'Ex: Gostaria de rever o layout da cozinha e ajustar as cores...'
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-none"
                  />
                </div>

                <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100 flex items-start gap-2 text-xs text-blue-900">
                  <Mail className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    Um código de confirmação de 6 dígitos será enviado para o e-mail cadastrado do cliente selecionado para validar a autoria da aprovação.
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setModalAction(null)
                      setSelectedStage(null)
                    }}
                    className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    disabled={sendingOtp || !selectedClientId}
                    onClick={handleSendOtp}
                    className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    {sendingOtp ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando Código...
                      </>
                    ) : (
                      <>
                        Enviar Código de Confirmação <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* PASSO 2: INSERÇÃO DO CÓDIGO OTP RECEBIDO NO E-MAIL */
              <form onSubmit={handleConfirmApproval} className="space-y-5">
                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 text-xs text-emerald-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                    <Mail className="w-4 h-4 text-emerald-700" />
                    <span>Código de confirmação enviado!</span>
                  </div>
                  <p className="text-slate-600">
                    Enviamos o código para <strong>{maskedEmail}</strong>. Verifique sua caixa de entrada (e pasta de spam).
                  </p>
                </div>

                <div>
                  <label htmlFor="otpCodeInput" className="block text-xs font-bold uppercase tracking-wider text-slate-700 text-center mb-2">
                    Digite o código de 6 dígitos
                  </label>
                  <input
                    id="otpCodeInput"
                    type="text"
                    maxLength={6}
                    autoComplete="one-time-code"
                    autoFocus
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center tracking-[10px] font-mono text-3xl font-bold py-3 px-4 rounded-2xl border-2 border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-300"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" /> Trocar cliente
                  </button>

                  <button
                    type="button"
                    disabled={resendCooldown > 0 || sendingOtp}
                    onClick={handleSendOtp}
                    className="text-slate-600 hover:text-slate-900 disabled:opacity-50 inline-flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <RotateCcw className={`w-3 h-3 ${sendingOtp ? 'animate-spin' : ''}`} />
                    {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar código'}
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={submittingApproval}
                    onClick={() => {
                      setModalAction(null)
                      setSelectedStage(null)
                    }}
                    className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={submittingApproval || otpCode.trim().length !== 6}
                    className={`py-2.5 px-5 rounded-xl text-xs font-bold text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                      modalAction === 'approved'
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                        : 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                    }`}
                  >
                    {submittingApproval ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Confirmando...
                      </>
                    ) : modalAction === 'approved' ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" /> Confirmar Aprovação
                      </>
                    ) : (
                      'Confirmar Solicitação de Ajustes'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 px-6 mt-8">
        <div className="max-w-4xl mx-auto text-center text-xs text-slate-400">
          Orgarq Architecture OS • Conexão Segura & Validação com Código de Confirmação
        </div>
      </footer>
    </div>
  )
}
