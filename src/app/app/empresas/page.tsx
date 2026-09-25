import { getActiveOrganization } from '@/lib/server/active-org'
import { redirect } from 'next/navigation'
import { hasPermission } from '@/lib/server/guard'
import AccessDenied from '@/components/ui/AccessDenied'
import { getCompaniesAction } from '@/lib/actions/companies'
import CompaniesManagerClient from '@/components/companies/CompaniesManagerClient'

export const metadata = {
  title: 'Empresas e Serviços | Organizeasy',
  description: 'Gestão de fornecedores, prestadores de serviços, vínculos com projetos e controle de comissões/RT',
}

export default async function EmpresasPage() {
  const { supabase, user, activeOrg, isOwner, userPermissions } = await getActiveOrganization()

  if (!activeOrg) {
    redirect('/onboarding')
  }

  // Proteção de rota
  if (!hasPermission(isOwner, userPermissions, 'module_companies')) {
    return (
      <AccessDenied
        moduleName="Empresas e Prestadores de Serviços"
        userProfileName={activeOrg.profile_name}
        userProfileColor={activeOrg.profile_color}
      />
    )
  }

  const orgId = activeOrg.id

  const res = await getCompaniesAction({ organizationId: orgId })
  const initialCompanies = res.companies || []

  return (
    <div className="space-y-6 antialiased max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Empresas e Prestadores de Serviços
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cadastre parceiros, controle quais serviços estão em cada projeto e acompanhe o repasse de comissões (RT).
          </p>
        </div>
      </div>

      {/* Interactive Companies Manager */}
      <CompaniesManagerClient
        initialCompanies={initialCompanies}
        organizationId={orgId}
        isOwner={isOwner}
        userPermissions={userPermissions}
      />
    </div>
  )
}
