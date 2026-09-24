import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { ArrowLeft } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { getPortalDataAction } from '@/lib/actions/portal'
import {
  verifyClientPortalAccessCookie,
  verifyProjectPortalAccessCookie,
  hashAccessCode,
} from '@/lib/server/client-auth-crypto'
import PortalClient, { PortalData } from '@/components/portal/PortalClient'

export default async function CustomerProjectViewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  // 1. Busca token ativo de acesso a este projeto
  const { data: tokenRecord } = await supabase
    .from('client_access_tokens')
    .select('token')
    .eq('project_id', id)
    .eq('is_revoked', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let token = tokenRecord?.token

  if (!token) {
    // Se ainda não existir token, gera um
    const newToken = `portal_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`
    await supabase.from('client_access_tokens').insert({
      project_id: id,
      token: newToken,
    })
    token = newToken
  }

  const res = await getPortalDataAction(token)

  if (res.error || !res.data) {
    notFound()
  }

  const portalData = res.data as unknown as PortalData
  const cookieStore = await cookies()

  // 2. Identifica qual cliente está autenticado para este projeto
  let activeClientId: string | undefined
  let activeClientName: string | undefined
  let activePortalToken: string | undefined
  let sessionExpiresAt: number | undefined

  // Verifica se há cookie de projeto válido
  const projCookieVal = cookieStore.get(`organizeasy_proj_${token}`)?.value
  if (projCookieVal) {
    const projSession = verifyProjectPortalAccessCookie(projCookieVal, token)
    if (projSession?.clientId) {
      const matchedClient = (portalData.clients || []).find((c: any) => c.id === projSession.clientId)
      const currentCodeHash = hashAccessCode((matchedClient as any)?.access_code || '')
      if (!matchedClient || (projSession.codeHash && projSession.codeHash !== currentCodeHash)) {
        cookieStore.delete(`organizeasy_proj_${token}`)
      } else {
        activeClientId = projSession.clientId
        activeClientName = projSession.clientName
        sessionExpiresAt = projSession.exp
      }
    }
  }

  // Se não achou no cookie de projeto, verifica se algum cliente vinculado tem sessão aberta de portal geral
  if (!activeClientId && portalData.clients && portalData.clients.length > 0) {
    for (const c of portalData.clients) {
      if (c.portal_token) {
        const cpCookie =
          cookieStore.get(`organizeasy_cp_${c.portal_token}`)?.value ||
          cookieStore.get(`orgarq_cp_${c.portal_token}`)?.value
        if (cpCookie) {
          const cpSession = verifyClientPortalAccessCookie(cpCookie, c.portal_token)
          if (cpSession?.clientId === c.id) {
            const currentCodeHash = hashAccessCode((c as any)?.access_code || '')
            if (cpSession.codeHash && cpSession.codeHash !== currentCodeHash) {
              cookieStore.delete(`organizeasy_cp_${c.portal_token}`)
              cookieStore.delete(`orgarq_cp_${c.portal_token}`)
            } else {
              activeClientId = c.id
              activeClientName = c.name
              activePortalToken = c.portal_token
              sessionExpiresAt = cpSession.exp
              break
            }
          }
        }
      }
    }
  }

  // Se não houver nenhum cliente autenticado, redireciona para o link direto do projeto com desafio de código
  if (!activeClientId) {
    redirect(`/portal/${token}`)
  }

  const clientWithPortal = (portalData.clients || []).find(
    (c: any) => c.id === activeClientId && Boolean(c.portal_token)
  )
  const backHref = clientWithPortal?.portal_token
    ? `/portal/${clientWithPortal.portal_token}`
    : activePortalToken
      ? `/portal/${activePortalToken}`
      : '/portal'

  // Remove access_code antes de enviar ao cliente por segurança
  portalData.clients = (portalData.clients || []).map((c: any) => {
    const { access_code, ...rest } = c
    return rest
  })

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top Client Navigation Header */}
      <div className="bg-slate-900 text-white px-6 py-2.5 border-b border-slate-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer bg-transparent border-0 p-0 shadow-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para Meus Projetos com este Escritório</span>
          </Link>
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            Acompanhamento de Projeto — {portalData.project.code}
          </span>
        </div>
      </div>

      {/* Render Portal Client Timeline & Approvals */}
      <PortalClient
        token={token}
        data={portalData}
        activeClientId={activeClientId}
        activeClientName={activeClientName}
        sessionExpiresAt={sessionExpiresAt}
      />
    </div>
  )
}
