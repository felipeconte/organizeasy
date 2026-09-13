import { getActiveOrganization } from '@/lib/server/active-org'
import { redirect } from 'next/navigation'
import { hasPermission } from '@/lib/server/guard'
import AccessDenied from '@/components/ui/AccessDenied'
import ProjectsManagerClient, { ProjectItem } from '@/components/projects/ProjectsManagerClient'

export default async function ProjectsListPage() {
  const { supabase, user, activeOrg, isOwner, userPermissions } = await getActiveOrganization()

  if (!activeOrg) {
    redirect('/onboarding')
  }

  // Proteção de rota
  if (!hasPermission(isOwner, userPermissions, 'module_projects')) {
    return (
      <AccessDenied
        moduleName="Projetos e Tarefas"
        userProfileName={activeOrg.profile_name}
        userProfileColor={activeOrg.profile_color}
      />
    )
  }

  // 1. Busca todos os projetos vinculados à organização ativa
  const { data: projs } = await supabase
    .from('projects')
    .select('*')
    .eq('organization_id', activeOrg.id)
    .order('created_at', { ascending: false })

  // 2. Busca todos os clientes cadastrados da organização ativa
  const { data: clientsData } = await supabase
    .from('clients')
    .select('*')
    .eq('organization_id', activeOrg.id)
    .order('name', { ascending: true })

  const clients = (clientsData || []) as any[]

  // 3. Busca vínculos da tabela project_clients
  const { data: pcData } = await supabase
    .from('project_clients')
    .select('project_id, client_id')

  const projectClientsMap = new Map<string, string[]>()
  ;(pcData || []).forEach((pc) => {
    const list = projectClientsMap.get(pc.project_id) || []
    list.push(pc.client_id)
    projectClientsMap.set(pc.project_id, list)
  })

  const projects = (projs || []).map((p: any) => ({
    ...p,
    client_ids: projectClientsMap.get(p.id) || (p.client_id ? [p.client_id] : []),
  })) as unknown as ProjectItem[]

  return (
    <ProjectsManagerClient
      initialProjects={projects}
      initialClients={clients}
      organizationId={activeOrg.id}
      isOwner={isOwner}
      userPermissions={userPermissions}
    />
  )
}
