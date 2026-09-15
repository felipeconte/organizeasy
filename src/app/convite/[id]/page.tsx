import { getInviteDetailsAction } from '@/lib/actions/access-profiles'
import { createClient } from '@/lib/supabase/server'
import InviteAcceptanceClient from '@/components/invites/InviteAcceptanceClient'
import Link from 'next/link'
import { Building2, AlertCircle, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Convite para Escritório | Organizeasy',
  description: 'Aceite seu convite para ingressar na equipe no Organizeasy.',
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const inviteRes = await getInviteDetailsAction(id)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!inviteRes.success || !inviteRes.invite) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-slate-800">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200/90 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Convite Não Encontrado</h1>
          <p className="text-sm text-slate-600">
            {inviteRes.error ||
              'Este link de convite é inválido, expirou ou já foi utilizado por outro membro.'}
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Ir para o Login</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <InviteAcceptanceClient
      invite={inviteRes.invite}
      currentUser={
        user
          ? {
              id: user.id,
              email: user.email || '',
              name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
            }
          : null
      }
    />
  )
}
