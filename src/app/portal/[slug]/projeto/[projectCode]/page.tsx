/* eslint-disable react-hooks/purity */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShieldAlert, FolderX } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { getProjectForOfficePortalAction } from '@/lib/actions/client-portal-auth'
import { getPortalDataAction } from '@/lib/actions/portal'
import PortalClient, { PortalData } from '@/components/portal/PortalClient'
import OfficePortalLogin from '@/components/portal/OfficePortalLogin'

export default async function OfficeProjectDirectViewPage({
  params,
}: {
  params: Promise<{ slug: string; projectCode: string }>
}) {
  const { slug, projectCode } = await params
  const supabase = createAdminClient()

  // 1. Valida se o projeto existe e se o cliente está autenticado e autorizado
  const authRes = await getProjectForOfficePortalAction(slug, projectCode)

  if (authRes.needAuth && authRes.office) {
    // Redireciona para o login do escritório informando a URL de retorno
    return (
      <OfficePortalLogin
        office={authRes.office}
        redirectUrl={`/portal/${slug}/projeto/${projectCode}`}
      />
    )
  }

  if (authRes.error === 'OFFICE_NOT_FOUND') {
    notFound()
  }

  if (authRes.error === 'PROJECT_NOT_FOUND') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 text-slate-800 flex items-center justify-center p-4 antialiased">
        <div className="max-w-md w-full bg-white p-7 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center mx-auto shadow-xs">
            <FolderX className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Projeto Não Encontrado</h2>
          <p className="text-xs text-slate-500">
            {projectCode.length > 20
              ? 'Não localizamos nenhum projeto correspondente a este link neste escritório.'
              : <>Não localizamos nenhum projeto correspondente a <span className="font-mono font-bold text-slate-800">&quot;{projectCode}&quot;</span> neste escritório.</>}
          </p>
          <Link
            href={`/portal/${slug}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20"
          >
            <ArrowLeft className="w-4 h-4" /> Ir para a página do escritório
          </Link>
        </div>
      </div>
    )
  }

  if (authRes.error === 'UNAUTHORIZED_FOR_PROJECT') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 text-slate-800 flex items-center justify-center p-4 antialiased">
        <div className="max-w-md w-full bg-white p-7 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center mx-auto shadow-xs">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Acesso Restrito ao Projeto</h2>
          <p className="text-xs text-slate-500">
            Olá, <strong className="text-slate-800">{authRes.client?.name}</strong>. Este projeto não está vinculado ao seu usuário para acompanhamento ou aprovações. Entre em contato com o escritório para mais informações.
          </p>
          <Link
            href={`/portal/${slug}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200"
          >
            <ArrowLeft className="w-4 h-4" /> Ver Meus Projetos Vinculados
          </Link>
        </div>
      </div>
    )
  }

  const project = authRes.project
  if (!project) {
    notFound()
  }

  // 2. Busca ou gera token ativo de acesso ao projeto para o PortalClient
  const { data: tokenRecord } = await supabase
    .from('client_access_tokens')
    .select('token')
    .eq('project_id', project.id)
    .eq('is_revoked', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let token = tokenRecord?.token

  if (!token) {
    const newToken = `portal_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`
    await supabase.from('client_access_tokens').insert({
      project_id: project.id,
      token: newToken,
    })
    token = newToken
  }

  const res = await getPortalDataAction(token)
  if (res.error || !res.data) {
    notFound()
  }

  const portalData = res.data as unknown as PortalData

  return (
    <PortalClient
      token={token}
      data={portalData}
      activeClientId={authRes.client?.id}
      activeClientName={authRes.client?.name}
      orgSlug={slug}
      backHref={`/portal/${slug}`}
      sessionExpiresAt={authRes.sessionExpiresAt}
    />
  )
}
