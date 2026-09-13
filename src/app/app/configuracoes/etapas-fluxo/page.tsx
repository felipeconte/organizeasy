import { getActiveOrganization } from '@/lib/server/active-org'
import { redirect } from 'next/navigation'
import { hasPermission } from '@/lib/server/guard'
import AccessDenied from '@/components/ui/AccessDenied'
import WorkflowStagesManager from '@/components/workflow/WorkflowStagesManager'
import { getWorkflowStagesAction } from '@/lib/actions/workflow-stages'
import BackButton from '@/components/ui/BackButton'

export default async function WorkflowStagesConfigPage() {
  const { supabase, user, activeOrg, isOwner, userPermissions } = await getActiveOrganization()

  if (!activeOrg) {
    redirect('/onboarding')
  }

  // Proteção de rota
  if (!hasPermission(isOwner, userPermissions, 'settings_stages')) {
    return (
      <AccessDenied
        moduleName="Etapas do Projeto"
        userProfileName={activeOrg.profile_name}
        userProfileColor={activeOrg.profile_color}
      />
    )
  }

  const orgId = activeOrg.id

  const { stages } = await getWorkflowStagesAction(orgId)

  return (
    <div className="max-w-5xl mx-auto space-y-6 antialiased">
      <WorkflowStagesManager
        organizationId={orgId}
        initialStages={stages}
      >
        {/* Top Breadcrumb & Title */}
        <div className="flex items-center gap-3">
          <BackButton fallbackHref="/app" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Etapas do Projeto
              </h1>
            </div>
            <p className="text-sm text-slate-500">
              Gerencie as colunas do Kanban e legendas do Gantt compartilhadas pelo escritório.
            </p>
          </div>
        </div>
      </WorkflowStagesManager>
    </div>
  )
}
