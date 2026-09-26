import { requireProjectAccess, hasPermission } from '@/lib/server/guard'
import { getActiveOrganization } from '@/lib/server/active-org'
import AccessDenied from '@/components/ui/AccessDenied'
import { notFound } from 'next/navigation'
import { getWorkflowStagesAction } from '@/lib/actions/workflow-stages'
import TaskDetailPageClient from '@/components/projects/TaskDetailPageClient'
import type { TaskDetailData, MemberOption } from '@/components/projects/TaskDetailDrawer'

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>
}) {
  const { id: projectId, taskId } = await params
  const { supabase, project, user } = await requireProjectAccess(projectId)

  if (!project) {
    notFound()
  }

  const { activeOrg, isOwner, userPermissions } = await getActiveOrganization()

  // Proteção de rota
  if (!hasPermission(isOwner, userPermissions, 'module_projects')) {
    return (
      <AccessDenied
        moduleName="Projetos e Tarefas"
        userProfileName={activeOrg?.profile_name}
        userProfileColor={activeOrg?.profile_color}
      />
    )
  }

  // 1. Busca todas as etapas ativas do projeto para cálculo de subtarefas e hierarquia
  const { data: stagesData } = await supabase
    .from('project_stages')
    .select('*')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('stage_order', { ascending: true })

  const allStages = (stagesData || []) as TaskDetailData[]

  // 2. Localiza a tarefa atual
  const currentTask = allStages.find((s) => s.id === taskId)
  if (!currentTask) {
    notFound()
  }

  // 3. Busca etapas do fluxo de trabalho configuradas para a organização
  const { stages: workflowStages } = await getWorkflowStagesAction(project.organization_id)

  // 4. Busca membros da organização para responsáveis
  const { data: orgMembers } = await supabase
    .from('organization_members')
    .select('user_id, role')
    .eq('organization_id', project.organization_id)

  const memberUserIds = (orgMembers || []).map((m) => m.user_id)
  if (!memberUserIds.includes(user.id)) {
    memberUserIds.push(user.id)
  }

  const { data: userProfiles } = await supabase
    .from('user_profiles')
    .select('user_id, full_name, display_name, avatar_url')
    .in('user_id', memberUserIds)

  const profileMap = new Map<string, { name: string; avatarUrl?: string | null }>()
  userProfiles?.forEach((p) => {
    const name = p.display_name || p.full_name
    if (name) {
      profileMap.set(p.user_id, { name, avatarUrl: p.avatar_url })
    }
  })

  const membersList: MemberOption[] = (orgMembers || []).map((m) => {
    const profile = profileMap.get(m.user_id)
    const isSelf = m.user_id === user.id
    const currentMetaName = isSelf
      ? user.user_metadata?.display_name || user.user_metadata?.full_name
      : null
    const baseName =
      profile?.name ||
      currentMetaName ||
      (isSelf ? user.email?.split('@')[0] || 'Você' : 'Membro da Equipe')
    const finalName = isSelf && !baseName.includes('(Você)') ? `${baseName} (Você)` : baseName

    return {
      id: m.user_id,
      name: finalName,
      role: m.role,
      avatarUrl: profile?.avatarUrl || (isSelf ? user.user_metadata?.avatar_url : null),
    }
  })

  if (!membersList.some((m) => m.id === user.id)) {
    const selfProfile = profileMap.get(user.id)
    const selfName =
      selfProfile?.name ||
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'Você'
    membersList.unshift({
      id: user.id,
      name: `${selfName} (Você)`,
      role: 'owner',
      avatarUrl: selfProfile?.avatarUrl || user.user_metadata?.avatar_url || null,
    })
  }

  // 5. Busca token de acesso ao portal do cliente (se existente)
  const { data: existingToken } = await supabase
    .from('client_access_tokens')
    .select('token')
    .eq('project_id', projectId)
    .eq('is_revoked', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const portalToken = existingToken?.token || ''

  const canManageTasks = isOwner || hasPermission(isOwner, userPermissions, 'tasks_manage')

  return (
    <TaskDetailPageClient
      initialStage={currentTask}
      projectId={projectId}
      project={{
        id: project.id,
        title: project.title,
        code: project.code,
        organization_id: project.organization_id,
      }}
      workflowStages={workflowStages}
      members={membersList}
      allStages={allStages}
      readOnly={!canManageTasks}
      portalToken={portalToken}
    />
  )
}
