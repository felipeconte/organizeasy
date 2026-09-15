import { requireOrgAccess, hasPermission } from '@/lib/server/guard'
import { notFound } from 'next/navigation'
import AccessDenied from '@/components/ui/AccessDenied'
import { getCompanyByIdAction } from '@/lib/actions/companies'
import CompanyDetailClient from '@/components/companies/CompanyDetailClient'
import { BreadcrumbSetter } from '@/contexts/BreadcrumbContext'

export const metadata = {
  title: 'Detalhes da Empresa | Organizeasy',
  description: 'Informações cadastrais, projetos atendidos e controle de comissões/RT da empresa parceira',
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const res = await getCompanyByIdAction(id)

  if (!res.success || !res.company) {
    notFound()
  }

  const { supabase, isOwner, permissions } = await requireOrgAccess(res.company.organization_id)

  if (!hasPermission(isOwner, permissions, 'module_companies')) {
    return (
      <AccessDenied
        moduleName="Empresas e Prestadores de Serviços"
      />
    )
  }

  // Busca lista de projetos da organização para o modal de vincular a novos projetos
  const { data: projects } = await supabase
    .from('projects')
    .select('id, code, title, client_name')
    .eq('organization_id', res.company.organization_id)
    .order('created_at', { ascending: false })

  return (
    <>
      <BreadcrumbSetter
        items={[
          { label: 'Escritório', href: '/app' },
          { label: 'Empresas e Serviços', href: '/app/empresas' },
          { label: res.company.trade_name || res.company.name || 'Empresa Parceira' },
        ]}
      />
      <CompanyDetailClient
        initialCompany={res.company}
        initialProjects={res.projects || []}
        availableProjects={projects || []}
        organizationId={res.company.organization_id}
        isOwner={isOwner}
        userPermissions={permissions}
      />
    </>
  )
}
