import { getActiveOrganization } from '@/lib/server/active-org'
import { redirect } from 'next/navigation'
import { hasPermission } from '@/lib/server/guard'
import AccessDenied from '@/components/ui/AccessDenied'
import { getClientsAction } from '@/lib/actions/clients'
import ClientsManagerClient from '@/components/clients/ClientsManagerClient'

export const metadata = {
  title: 'Clientes | Organizeasy',
  description: 'Gestão de clientes e vínculo de projetos',
}

export default async function ClientesPage() {
  const { activeOrg, isOwner, userPermissions } = await getActiveOrganization()

  if (!activeOrg) {
    redirect('/onboarding')
  }

  // Proteção de rota
  if (!hasPermission(isOwner, userPermissions, 'module_clients')) {
    return (
      <AccessDenied
        moduleName="Clientes e Portal"
        userProfileName={activeOrg.profile_name}
        userProfileColor={activeOrg.profile_color}
      />
    )
  }

  const res = await getClientsAction(activeOrg.id)
  const initialClients = res.clients || []

  return (
    <div className="space-y-6 antialiased max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Clientes
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie contatos, documentos e visualize todos os projetos vinculados a cada cliente.
          </p>
        </div>
      </div>

      {/* Interactive Clients Manager */}
      <ClientsManagerClient
        initialClients={initialClients}
        organizationId={activeOrg.id}
        isOwner={isOwner}
        userPermissions={userPermissions}
      />
    </div>
  )
}
