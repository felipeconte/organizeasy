'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireProjectAccess } from '@/lib/server/guard'
import { sanitizeText } from '@/lib/server/sanitize'
import {
  normalizeWorkflowStages,
  getApprovedStage,
  getRevisionStage,
} from '@/lib/workflow-stages'
import { generateApprovalOtpCode } from '@/lib/server/client-auth-crypto'
import { sendStageApprovalOtpEmail } from '@/lib/server/email'
import { unlockClientPortalSessionAction } from '@/lib/actions/client-portal-auth'

function maskEmail(email?: string | null): string {
  if (!email || !email.includes('@')) return ''
  const [local, domain] = email.split('@')
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`
}

/**
 * Gera ou recupera o Magic Link / Token do Portal do Cliente para o projeto específico.
 */
export async function getOrCreatePortalTokenAction(projectId: string) {
  const { supabase } = await requireProjectAccess(projectId)

  // 1. Procura token ativo existente
  const { data: existingToken } = await supabase
    .from('client_access_tokens')
    .select('token, expires_at')
    .eq('project_id', projectId)
    .eq('is_revoked', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingToken?.token) {
    return { token: existingToken.token }
  }

  // 2. Se não existir, gera um novo
  const { data: newToken, error } = await supabase
    .from('client_access_tokens')
    .insert({ project_id: projectId })
    .select('token')
    .single()

  if (error || !newToken) {
    return { error: 'Falha ao gerar link do cliente.' }
  }

  return { token: newToken.token }
}

/**
 * Consulta dados do projeto para o portal a partir do token de acesso direto.
 * Não exige código de segurança — já vem autenticado!
 */
export async function getPortalDataAction(token: string) {
  const supabase = createAdminClient()

  // 1. Valida token
  const { data: tokenRecord } = await supabase
    .from('client_access_tokens')
    .select('project_id, is_revoked, expires_at')
    .eq('token', token)
    .eq('is_revoked', false)
    .limit(1)
    .maybeSingle()

  if (!tokenRecord?.project_id) {
    return { error: 'Link do portal inválido ou expirado.' }
  }

  // Atualiza timestamp de último acesso
  await supabase
    .from('client_access_tokens')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('token', token)

  const { data: project } = await supabase
    .from('projects')
    .select('id, code, title, description, client_id, client_name, area_sqm, deadline, status, organization_id')
    .eq('id', tokenRecord.project_id)
    .single()

  if (!project) {
    return { error: 'Projeto não encontrado.' }
  }

  let { data: org, error: orgErr } = await (supabase
    .from('organizations') as any)
    .select('name, logo_url, professional_council_id, phone, email, workflow_stages')
    .eq('id', project.organization_id)
    .maybeSingle()

  if (orgErr && (orgErr.message?.includes('professional_council_id') || orgErr.code === '42703')) {
    const fallbackOrg = await (supabase
      .from('organizations') as any)
      .select('name, logo_url, cau_caubr, phone, email, workflow_stages')
      .eq('id', project.organization_id)
      .maybeSingle()
    org = fallbackOrg.data
  }

  // 2. Busca todos os clientes vinculados ao projeto
  const { data: pcRows } = await supabase
    .from('project_clients')
    .select('client_id, clients(id, name, email, phone, person_type, portal_token, access_code)')
    .eq('project_id', project.id)

  let linkedClients: {
    id: string
    name: string
    email: string | null
    phone: string | null
    person_type: string
    portal_token?: string | null
    access_code?: string | null
  }[] = []

  if (pcRows && pcRows.length > 0) {
    linkedClients = pcRows
      .map((r: any) => r.clients)
      .filter(Boolean)
  }

  // Fallback para projetos legados
  if (linkedClients.length === 0) {
    if (project.client_id) {
      const { data: singleClient } = await supabase
        .from('clients')
        .select('id, name, email, phone, person_type, portal_token, access_code')
        .eq('id', project.client_id)
        .maybeSingle()
      if (singleClient) linkedClients.push(singleClient)
    } else if (project.client_name) {
      linkedClients.push({
        id: 'legacy-client',
        name: project.client_name,
        email: null,
        phone: null,
        person_type: 'PF',
        portal_token: null,
      })
    }
  }

  // Como o cliente acessou via link mágico direto de projeto, desbloqueamos a sessão do portal dele
  // para que, caso ele clique em "Ver Todos os Meus Projetos", navegue para a página principal sem pedir código!
  for (const c of linkedClients) {
    if (c.portal_token) {
      await unlockClientPortalSessionAction(c.portal_token)
    }
  }

  const { data: stages } = await supabase
    .from('project_stages')
    .select('id, name, description, stage_order, status, progress_percent, start_date, due_date, is_client_approval_required, is_locked_for_client, attachments, comments')
    .eq('project_id', project.id)
    .eq('is_client_approval_required', true)
    .order('stage_order', { ascending: true })

  // 3. Busca histórico de aprovações da tabela stage_approvals
  const { data: approvalsData } = await supabase
    .from('stage_approvals')
    .select('id, stage_id, client_id, approver_name, approver_email, action, created_at, feedback_message')
    .eq('project_id', project.id)
    .order('created_at', { ascending: true })

  const stageApprovalsMap = new Map<string, any[]>()
  ;(approvalsData || []).forEach((a) => {
    const list = stageApprovalsMap.get(a.stage_id) || []
    list.push(a)
    stageApprovalsMap.set(a.stage_id, list)
  })

  const totalRequired = Math.max(linkedClients.length, 1)

  const enrichedStages = (stages || []).map((s: any) => {
    const stageApprovals = stageApprovalsMap.get(s.id) || []
    const approvedRecords = stageApprovals.filter((a) => a.action === 'approved')
    const manualApprovalRecord = approvedRecords.find((a) => !a.client_id)

    // Identifica clientes únicos que aprovaram
    const uniqueApprovedKeys = new Set(
      approvedRecords.map((a) => a.client_id || a.approver_name.toLowerCase())
    )
    const currentApprovedCount = uniqueApprovedKeys.size
    const isFullyApproved = Boolean(manualApprovalRecord) || currentApprovedCount >= totalRequired

    const approvedClientsList = approvedRecords.map((a) => ({
      clientId: a.client_id,
      name: a.approver_name,
      approvedAt: a.created_at,
    }))

    const rawAttachments = Array.isArray(s.attachments) ? s.attachments : []
    const visibleAttachments = rawAttachments.filter((att: any) => att.is_visible_to_client !== false)

    return {
      ...s,
      attachments: visibleAttachments,
      approvals: stageApprovals,
      manualApproval: manualApprovalRecord
        ? {
            approverName: manualApprovalRecord.approver_name,
            approverEmail: manualApprovalRecord.approver_email,
            feedbackMessage: manualApprovalRecord.feedback_message,
            approvedAt: manualApprovalRecord.created_at,
          }
        : null,
      approvalProgress: {
        totalRequired,
        currentApprovedCount,
        isFullyApproved,
        approvedClients: approvedClientsList,
      },
    }
  })

  const workflowStages = normalizeWorkflowStages(org?.workflow_stages)

  return {
    data: {
      project: {
        id: project.id,
        code: project.code,
        title: project.title,
        description: project.description,
        client_name: project.client_name,
        area_sqm: project.area_sqm,
        deadline: project.deadline,
        status: project.status,
      },
      clients: linkedClients,
      organization: org ? {
        ...org,
        professional_council_id: (org as any).professional_council_id || (org as any).cau_caubr || null,
        cau_caubr: (org as any).professional_council_id || (org as any).cau_caubr || null,
      } : {
        name: 'Meu Escritório',
        logo_url: null,
        cau_caubr: null,
        professional_council_id: null,
        phone: null,
        email: null,
      },
      stages: enrichedStages,
      workflowStages,
    },
  }
}

/**
 * Dispara código de confirmação (OTP de 6 dígitos) para o e-mail do cliente selecionado
 */
export async function sendStageApprovalOtpAction(
  token: string,
  stageId: string,
  clientId: string,
  actionType: 'approved' | 'changes_requested'
): Promise<{
  success: boolean
  maskedEmail?: string
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // 1. Valida token
    const { data: tokenRecord } = await supabase
      .from('client_access_tokens')
      .select('project_id')
      .eq('token', token)
      .eq('is_revoked', false)
      .maybeSingle()

    if (!tokenRecord?.project_id) {
      return { success: false, error: 'Link do portal inválido ou expirado.' }
    }

    const projectId = tokenRecord.project_id

    // 2. Busca informações do projeto e da organização
    const { data: project } = await supabase
      .from('projects')
      .select('id, code, title, organization_id, organizations(name)')
      .eq('id', projectId)
      .single()

    if (!project) {
      return { success: false, error: 'Projeto não encontrado.' }
    }

    // 3. Busca informações da etapa
    const { data: stage } = await supabase
      .from('project_stages')
      .select('id, name')
      .eq('id', stageId)
      .eq('project_id', projectId)
      .single()

    if (!stage) {
      return { success: false, error: 'Etapa não encontrada.' }
    }

    // 4. Busca informações do cliente selecionado
    const { data: client } = await supabase
      .from('clients')
      .select('id, name, email')
      .eq('id', clientId)
      .single()

    if (!client || !client.email) {
      return {
        success: false,
        error: 'O cliente selecionado não possui um e-mail cadastrado para receber o código de confirmação.',
      }
    }

    // 5. Gera código de 6 dígitos
    const otpCode = generateApprovalOtpCode()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutos

    // Invalida OTPs anteriores ainda pendentes desta etapa/cliente
    await supabase
      .from('stage_approval_otps')
      .update({ used_at: new Date().toISOString() })
      .eq('stage_id', stageId)
      .eq('client_id', clientId)
      .is('used_at', null)

    // Insere novo OTP
    const { error: insertErr } = await supabase
      .from('stage_approval_otps')
      .insert({
        project_id: projectId,
        stage_id: stageId,
        client_id: clientId,
        email: client.email,
        code: otpCode,
        action_type: actionType,
        expires_at: expiresAt,
      })

    if (insertErr) {
      console.error('Erro ao salvar OTP de aprovação:', insertErr)
      return { success: false, error: 'Falha ao registrar código de confirmação.' }
    }

    const officeName = (project.organizations as any)?.name || 'Meu Escritório'

    // Envia o e-mail com o código
    await sendStageApprovalOtpEmail({
      clientName: client.name,
      clientEmail: client.email,
      projectTitle: project.title,
      projectCode: project.code,
      stageName: stage.name,
      otpCode,
      actionType,
      officeName,
    })

    return {
      success: true,
      maskedEmail: maskEmail(client.email),
    }
  } catch (err: any) {
    console.error('sendStageApprovalOtpAction error:', err)
    return { success: false, error: err?.message || 'Erro ao enviar código de confirmação.' }
  }
}

/**
 * Valida o código OTP de confirmação e registra aprovação ou solicitação de ajustes do cliente.
 */
export async function submitClientApprovalAction(
  token: string,
  stageId: string,
  actionType: 'approved' | 'changes_requested',
  formData: FormData
) {
  const clientId = formData.get('clientId') as string
  const otpCode = sanitizeText(formData.get('otpCode') as string)
  const feedback = sanitizeText(formData.get('feedback') as string)

  if (!clientId) {
    return { error: 'Por favor, selecione quem está confirmando esta ação.' }
  }

  if (!otpCode || otpCode.trim().length !== 6) {
    return { error: 'Por favor, informe o código de confirmação de 6 dígitos recebido por e-mail.' }
  }

  const supabase = createAdminClient()

  // 1. Valida token e obtém project_id
  const { data: tokenRecord } = await supabase
    .from('client_access_tokens')
    .select('project_id')
    .eq('token', token)
    .eq('is_revoked', false)
    .single()

  if (!tokenRecord?.project_id) {
    return { error: 'Link do portal inválido ou expirado.' }
  }

  const projectId = tokenRecord.project_id

  // 2. Valida se o código OTP informado existe, está válido e não expirou
  const { data: validOtp, error: otpErr } = await supabase
    .from('stage_approval_otps')
    .select('id, email, code, expires_at, used_at')
    .eq('stage_id', stageId)
    .eq('client_id', clientId)
    .eq('code', otpCode.trim())
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (otpErr || !validOtp) {
    return {
      error: 'Código de confirmação inválido ou expirado. Verifique os números digitados ou solicite um novo código.',
    }
  }

  // 3. Marca o OTP como utilizado
  await supabase
    .from('stage_approval_otps')
    .update({ used_at: new Date().toISOString() })
    .eq('id', validOtp.id)

  // 4. Busca dados do projeto e cliente
  const { data: project } = await supabase
    .from('projects')
    .select('id, client_id, client_name, organization_id, organizations(workflow_stages)')
    .eq('id', projectId)
    .single()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, email')
    .eq('id', clientId)
    .single()

  const approverName = client?.name || 'Cliente'
  const approverEmail = client?.email || validOtp.email

  // 5. Busca total de clientes vinculados
  const { data: pcRows } = await supabase
    .from('project_clients')
    .select('client_id')
    .eq('project_id', projectId)

  const totalLinkedClients = Math.max((pcRows || []).length, 1)

  // 6. Workflow stages para status de aprovação
  const rawWorkflowStages = (project?.organizations as any)?.workflow_stages
  const normalizedStages = normalizeWorkflowStages(rawWorkflowStages)
  const approvedStage = getApprovedStage(normalizedStages)
  const revisionStage = getRevisionStage(normalizedStages)

  const targetStatus = actionType === 'approved'
    ? (approvedStage?.id || 'concluido')
    : (revisionStage?.id || 'em_producao')

  // 7. Registra na tabela stage_approvals
  await supabase.from('stage_approvals').insert({
    project_id: projectId,
    stage_id: stageId,
    client_id: clientId,
    action: actionType,
    approver_name: approverName,
    approver_email: approverEmail,
    feedback_message: feedback || null,
  })

  // 8. Conta aprovações únicas já registradas
  const { data: stageApprovals } = await supabase
    .from('stage_approvals')
    .select('id, client_id, approver_name, action')
    .eq('stage_id', stageId)
    .eq('project_id', projectId)
    .eq('action', 'approved')

  const uniqueApprovers = new Set(
    (stageApprovals || []).map((a) => a.client_id || a.approver_name.toLowerCase())
  )
  const approvedCount = uniqueApprovers.size
  const isFullyApproved = approvedCount >= totalLinkedClients

  // 9. Comentários de validação
  const { data: currentStage } = await supabase
    .from('project_stages')
    .select('comments')
    .eq('id', stageId)
    .eq('project_id', projectId)
    .single()

  const currentComments: any[] = Array.isArray(currentStage?.comments) ? currentStage.comments : []

  let commentText = ''
  if (actionType === 'approved') {
    if (isFullyApproved) {
      commentText = totalLinkedClients > 1
        ? `🎉 [Validação Concluída via E-mail] Aprovado por ${approverName} (${approvedCount} de ${totalLinkedClients} clientes aprovaram - Todas as aprovações concluídas!).${feedback ? `\nObservação: "${feedback}"` : ''}`
        : `✅ [Validação do Cliente via E-mail] Aprovado por ${approverName}.${feedback ? `\nObservação: "${feedback}"` : ''}`
    } else {
      commentText = `✅ [Validação Parcial via E-mail] Aprovado por ${approverName} (${approvedCount} de ${totalLinkedClients} aprovações necessárias). Aguardando aprovação dos demais clientes.${feedback ? `\nObservação: "${feedback}"` : ''}`
    }
  } else {
    commentText = `⚠️ [Validação do Cliente via E-mail] Solicitação de Ajustes por ${approverName}:\n"${feedback || 'Ajustes solicitados conforme alinhamento.'}"`
  }

  const validationComment = {
    id: `cmt-portal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: 'portal-client',
    user_name: `${approverName} (Cliente)`,
    user_email: approverEmail,
    text: commentText,
    created_at: new Date().toISOString(),
  }

  const updatedComments = [...currentComments, validationComment]

  // 10. Atualiza status da etapa
  if (actionType === 'approved') {
    if (isFullyApproved) {
      await (supabase
        .from('project_stages') as any)
        .update({
          status: targetStatus,
          progress_percent: 100,
          is_locked_for_client: true,
          comments: updatedComments,
        })
        .eq('id', stageId)
        .eq('project_id', projectId)
    } else {
      await (supabase
        .from('project_stages') as any)
        .update({
          status: 'em_aprovacao',
          progress_percent: Math.round((approvedCount / totalLinkedClients) * 100),
          is_locked_for_client: false,
          comments: updatedComments,
        })
        .eq('id', stageId)
        .eq('project_id', projectId)
    }
  } else {
    await (supabase
      .from('project_stages') as any)
      .update({
        status: targetStatus,
        progress_percent: 50,
        is_locked_for_client: false,
        comments: updatedComments,
      })
      .eq('id', stageId)
      .eq('project_id', projectId)
  }

  revalidatePath(`/portal/${token}`)
  revalidatePath(`/app/projetos/${projectId}`)
  revalidatePath('/app/projetos')
  return { success: true, action: actionType, isFullyApproved }
}
