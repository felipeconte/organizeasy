import { notFound } from 'next/navigation'
import { requireOrgAccess, hasPermission } from '@/lib/server/guard'
import AccessDenied from '@/components/ui/AccessDenied'
import { getClientByIdAction } from '@/lib/actions/clients'
import ClientDetailClient from '@/components/clients/ClientDetailClient'
import { BreadcrumbSetter } from '@/contexts/BreadcrumbContext'

export const metadata = {
  title: 'Detalhes do Cliente | Orgarq',
  description: 'Visualização de cadastro e projetos vinculados ao cliente',
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const res = await getClientByIdAction(id)
  if (!res.success || !res.client) {
    notFound()
  }

  const { isOwner, permissions } = await requireOrgAccess(res.client.organization_id)

  if (!hasPermission(isOwner, permissions, 'module_clients')) {
    return (
      <AccessDenied
        moduleName="Clientes e Portal"
      />
    )
  }

  return (
    <>
      <BreadcrumbSetter
        items={[
          { label: 'Escritório', href: '/app' },
          { label: 'Clientes', href: '/app/clientes' },
          { label: res.client.name },
        ]}
      />
      <ClientDetailClient
        client={res.client}
        projects={res.projects || []}
        organizationId={res.client.organization_id}
        isOwner={isOwner}
        userPermissions={permissions}
      />
    </>
  )
}
