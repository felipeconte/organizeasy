import { getActiveOrganization } from '@/lib/server/active-org'
import { redirect } from 'next/navigation'
import { hasPermission } from '@/lib/server/guard'
import AccessDenied from '@/components/ui/AccessDenied'
import { getFinancialPageData } from '@/lib/server/financial-page-data'
import FinancialManagerClient from '@/components/financial/FinancialManagerClient'

export const metadata = {
  title: 'Passado, Presente e Futuro | Organizeasy',
  description: 'Projeção de fluxo de caixa futuro e linha do tempo financeira.',
}

export default async function ProjecaoPage() {
  const { supabase, activeOrg, isOwner, userPermissions } = await getActiveOrganization()

  if (!activeOrg) {
    redirect('/onboarding')
  }

  // Proteção de rota
  if (!hasPermission(isOwner, userPermissions, 'module_financial')) {
    return (
      <AccessDenied
        moduleName="Gestão Financeira"
        userProfileName={activeOrg.profile_name}
        userProfileColor={activeOrg.profile_color}
      />
    )
  }

  const data = await getFinancialPageData(activeOrg.id, supabase)

  return (
    <FinancialManagerClient
      {...data}
      currentSubPage="projecao"
      isOwner={isOwner}
      userPermissions={userPermissions}
    />
  )
}
