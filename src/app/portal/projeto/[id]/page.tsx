import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getPortalDataAction } from '@/lib/actions/portal'
import PortalClient, { PortalData } from '@/components/portal/PortalClient'

export default async function CustomerProjectViewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

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
  const clientWithPortal = (portalData.clients || []).find((c: any) => Boolean(c.portal_token))
  const backHref = clientWithPortal?.portal_token
    ? `/portal/${clientWithPortal.portal_token}`
    : '/portal'

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
      <PortalClient token={token} data={portalData} />
    </div>
  )
}
