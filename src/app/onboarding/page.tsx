import { requireAuth } from '@/lib/server/guard'
import { redirect } from 'next/navigation'
import { getPendingInvitesForUserAction } from '@/lib/actions/access-profiles'
import OnboardingClient from '@/components/onboarding/OnboardingClient'

export const metadata = {
  title: 'Bem-vindo ao Organizeasy | Onboarding',
  description: 'Crie seu novo escritório ou participe de um escritório existente no Organizeasy.',
}

export default async function OnboardingPage() {
  const { supabase, user } = await requireAuth()

  // 1. Verifica se o usuário já possui alguma organização ativa
  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (member?.organization_id) {
    redirect('/app')
  }

  const { data: ownedOrg } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle()

  if (ownedOrg?.id) {
    redirect('/app')
  }

  // 2. Busca convites pendentes para o e-mail do usuário
  const invitesRes = await getPendingInvitesForUserAction()
  const initialInvites = invitesRes.success && invitesRes.invites ? invitesRes.invites : []

  return (
    <OnboardingClient
      user={{
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
      }}
      initialInvites={initialInvites}
    />
  )
}
