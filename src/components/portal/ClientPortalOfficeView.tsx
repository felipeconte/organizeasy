'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Calendar,
  Clock,
  ArrowRight,
  FileCheck,
  Phone,
  Mail,
  User,
  MapPin,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FolderGit2,
} from 'lucide-react'
import {
  ClientPortalOfficeData,
  clientPortalLogoutAction,
} from '@/lib/actions/client-portal-auth'
import { maskCPFOrCNPJ, maskPhone } from '@/lib/formatters-and-validators'
import { formatDateBR } from '@/lib/date-utils'

export default function ClientPortalOfficeView({
  portalToken,
  data,
}: {
  portalToken: string
  data: ClientPortalOfficeData
}) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const { client, office, projects } = data

  const handleLock = async () => {
    setLoggingOut(true)
    await clientPortalLogoutAction(portalToken)
    router.refresh()
  }

  const rawPhoneDigits = office.phone ? office.phone.replace(/\D/g, '') : ''
  const officeWhatsapp = rawPhoneDigits.length >= 10 ? `https://wa.me/55${rawPhoneDigits}` : null

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16 antialiased">
      {/* 1. TOP HEADER DO ESCRITÓRIO */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {office.logo_url ? (
              <img
                src={office.logo_url}
                alt={office.name}
                className="w-10 h-10 object-contain rounded-xl bg-white p-1 shrink-0 border border-slate-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-xs border border-slate-700">
                <img
                  src="/logos/logo-organizeasy-quadrado.webp"
                  alt={office.name}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold truncate text-white leading-tight">
                {office.name}
              </h1>
              <p className="text-xs text-slate-400 truncate">
                Portal do Cliente • {(office.professional_council_id || office.cau_caubr) ? `Registro: ${office.professional_council_id || office.cau_caubr}` : 'Acompanhamento de Projetos'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {officeWhatsapp && (
              <a
                href={officeWhatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-600/30 transition-all"
              >
                <Phone className="w-3.5 h-3.5" /> WhatsApp
              </a>
            )}

            <button
              type="button"
              onClick={handleLock}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
              title="Bloquear sessão neste dispositivo"
            >
              {loggingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Bloquear</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* 2. RESUMO DAS INFORMAÇÕES DO CLIENTE */}
        <section className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                <User className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Seus Dados Cadastrais com {office.name}
                </span>
                <h2 className="text-lg font-bold text-slate-900">{client.name}</h2>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200/80 px-3 py-1 rounded-full w-fit">
              {projects.length} projeto(s) em andamento
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {client.document_number && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Documento</span>
                <span className="font-mono font-bold text-slate-700">
                  {maskCPFOrCNPJ(client.document_number)}
                </span>
              </div>
            )}

            {client.email && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5 min-w-0">
                <span className="text-slate-400 font-bold block uppercase text-[10px]">E-mail</span>
                <span className="font-semibold text-slate-700 truncate block" title={client.email}>
                  {client.email}
                </span>
              </div>
            )}

            {client.phone && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Telefone</span>
                <span className="font-semibold text-slate-700">{maskPhone(client.phone)}</span>
              </div>
            )}

            {(client.city || client.state) && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Localização</span>
                <span className="font-semibold text-slate-700">
                  {client.city ? `${client.city}` : ''}
                  {client.city && client.state ? ' - ' : ''}
                  {client.state || ''}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* 3. PROJETOS COM ESTE ESCRITÓRIO */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Seus Projetos</h3>
              <p className="text-xs text-slate-500">
                Selecione um projeto para visualizar a linha do tempo e validar etapas
              </p>
            </div>
          </div>

          {projects.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <FolderGit2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-800">Nenhum projeto vinculado ainda</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Assim que a equipe do escritório iniciar seu projeto, ele aparecerá aqui para você acompanhar em tempo real.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white rounded-3xl p-6 border border-slate-200/80 hover:border-blue-400 transition-all shadow-xs hover:shadow-md flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-mono font-bold text-blue-600 uppercase tracking-wider block">
                          {project.code}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 leading-snug mt-0.5">
                          {project.title}
                        </h4>
                        {project.typology && (
                          <span className="text-xs text-slate-500 mt-0.5 block">
                            {project.typology}
                          </span>
                        )}
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {project.status === 'concluido'
                          ? 'Concluído'
                          : project.status === 'em_andamento'
                            ? 'Em Andamento'
                            : 'Ativo'}
                      </span>
                    </div>

                    {/* Alerta de aprovação pendente */}
                    {project.is_pending_client_approval && (
                      <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/90 flex items-center gap-2.5 text-xs text-amber-900 font-bold animate-pulse">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Aprovação pendente: {project.current_stage_name || 'Etapa aguardando validação'}</span>
                      </div>
                    )}

                    {/* Barra de Progresso */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span className="font-semibold">Progresso das Etapas</span>
                        <span className="font-bold text-slate-900 font-mono">{project.progress_percent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-600 to-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${project.progress_percent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{project.completed_stages} de {project.total_stages} etapas concluídas</span>
                        {project.deadline && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Previsão: {formatDateBR(project.deadline)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/portal/projeto/${project.id}`}
                    className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Acompanhar Linha do Tempo <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="mt-16 text-center text-xs text-slate-400">
        Organizeasy • Portal de Acompanhamento e Validação
      </footer>
    </div>
  )
}
