import { getActiveOrganization } from '@/lib/server/active-org'
import { redirect } from 'next/navigation'
import { hasPermission } from '@/lib/server/guard'
import AccessDenied from '@/components/ui/AccessDenied'
import { getFinancialPageData } from '@/lib/server/financial-page-data'
import FinancialManagerClient from '@/components/financial/FinancialManagerClient'

export const metadata = {
  title: 'Lançamentos Financeiros | Organizeasy',
  description: 'Controle completo de lançamentos, receitas, despesas e liquidações.',
}

export default async function LancamentosPage() {
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
      currentSubPage="lancamentos"
      isOwner={isOwner}
      userPermissions={userPermissions}
    />
  )
}
