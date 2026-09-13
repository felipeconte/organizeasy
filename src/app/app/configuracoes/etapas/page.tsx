import { getActiveOrganization } from '@/lib/server/active-org'
import { redirect } from 'next/navigation'
import { hasPermission } from '@/lib/server/guard'
import AccessDenied from '@/components/ui/AccessDenied'
import StageTemplatesManager, {
  TemplateData
} from '@/components/templates/StageTemplatesManager'

// Padrão do sistema (7 etapas)
const DEFAULT_STAGES = [
  {
    stage_order: 1,
    name: '01. Contrato',
    description: 'Formalização da proposta e assinatura de contrato',
    default_duration_days: 5,
    is_client_approval_required: true,
  },
  {
    stage_order: 2,
    name: '02. Briefing',
    description: 'Levantamento de necessidades, estilo e referências',
    default_duration_days: 7,
    is_client_approval_required: true,
  },
  {
    stage_order: 3,
    name: '03. Estudo Preliminar',
    description: 'Concepção volumétrica inicial e plantas de layout',
    default_duration_days: 15,
    is_client_approval_required: true,
  },
  {
    stage_order: 4,
    name: '04. Projeto 3D',
    description: 'Modelagem 3D e renders fotorrealistas para aprovação visual',
    default_duration_days: 15,
    is_client_approval_required: true,
  },
  {
    stage_order: 5,
    name: '05. Projeto Executivo',
    description: 'Desenvolvimento técnico de pranchas e paginações',
    default_duration_days: 25,
    is_client_approval_required: false,
  },
  {
    stage_order: 6,
    name: '06. Entrega Final',
    description: 'Emissão do caderno executivo e pranchas completas',
    default_duration_days: 5,
    is_client_approval_required: true,
  },
  {
    stage_order: 7,
    name: '07. Suporte',
    description: 'Tira-dúvidas técnico para obra e orçamentistas',
    default_duration_days: 15,
    is_client_approval_required: false,
  },
]

export default async function StageTemplatesPage() {
  const { supabase, user, activeOrg, isOwner, userPermissions } = await getActiveOrganization()

  if (!activeOrg) {
    redirect('/onboarding')
  }

  // Proteção do endpoint: impede que perfis sem permissão acessem pela URL
  if (!hasPermission(isOwner, userPermissions, 'settings_stages')) {
    return (
      <AccessDenied
        moduleName="Templates de Tarefas"
        userProfileName={activeOrg.profile_name}
        userProfileColor={activeOrg.profile_color}
      />
    )
  }

  const orgId = activeOrg.id

  // 2. Busca todos os templates da organização
  let templatesList: TemplateData[] = []

  if (orgId) {
    const { data: rawTemplates } = await supabase
      .from('stage_templates')
      .select('id, organization_id, name, description, is_default, stage_template_items(*)')
      .eq('organization_id', orgId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })

    if (rawTemplates && rawTemplates.length > 0) {
      templatesList = rawTemplates.map((t: any) => ({
        id: t.id,
        organization_id: t.organization_id,
        name: t.name,
        description: t.description,
        is_default: t.is_default,
        stage_template_items: Array.isArray(t.stage_template_items)
          ? t.stage_template_items.sort((a: any, b: any) => a.stage_order - b.stage_order)
          : [],
      }))
    } else {
      // Auto-seed do template oficial se não existir nenhum
      try {
        const { data: newTpl } = await supabase
          .from('stage_templates')
          .insert({
            organization_id: orgId,
            name: 'Padrão do Sistema',
            description: 'Template padrão com as 7 etapas oficiais de projeto',
            is_default: true,
          })
          .select('id, organization_id, name, description, is_default')
          .single()

        if (newTpl) {
          const itemsToInsert = DEFAULT_STAGES.map((s) => ({
            stage_template_id: newTpl.id,
            name: s.name,
            description: s.description,
            stage_order: s.stage_order,
            default_duration_days: s.default_duration_days,
            is_client_approval_required: s.is_client_approval_required,
          }))

          const { data: insertedItems } = await supabase
            .from('stage_template_items')
            .insert(itemsToInsert)
            .select('*')

          templatesList = [
            {
              ...newTpl,
              stage_template_items: (insertedItems || []).sort(
                (a: any, b: any) => a.stage_order - b.stage_order
              ),
            },
          ]
        }
      } catch (err) {
        console.warn('Falha no auto-seed de templates:', err)
      }
    }
  }

  // Fallback se nada foi retornado
  if (templatesList.length === 0) {
    templatesList = [
      {
        id: 'default-fallback',
        organization_id: orgId,
        name: 'Padrão do Sistema',
        description: 'Template padrão com as 7 etapas oficiais de projeto',
        is_default: true,
        stage_template_items: DEFAULT_STAGES.map((s, idx) => ({
          id: `item-${idx}`,
          stage_template_id: 'default-fallback',
          name: s.name,
          description: s.description,
          stage_order: s.stage_order,
          default_duration_days: s.default_duration_days,
          is_client_approval_required: s.is_client_approval_required,
        })),
      },
    ]
  }

  return <StageTemplatesManager initialTemplates={templatesList} />
}
