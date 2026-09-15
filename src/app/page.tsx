'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { LandingNavbar } from '@/components/layout/LandingNavbar'
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Zap,
  ListTodo,
  Kanban as KanbanIcon,
  CalendarRange,
  UserCheck,
  FileText,
  Clock,
  ChevronDown,
  Building,
  Check,
  X,
  Layers,
  Users,
  Lock,
  Compass,
  Briefcase,
  HardHat,
  Share2,
  FileCheck,
  Eye,
  Award
} from 'lucide-react'

export default function Home() {
  // State for Interactive Hero Mockup View
  const [activeView, setActiveView] = useState<'lista' | 'kanban' | 'gantt'>('lista')

  // State for Persona Showcase Tabs
  const [activePersona, setActivePersona] = useState<'gestor' | 'equipe' | 'cliente'>('gestor')

  // State for FAQ Accordion
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  // Interactive Project Stages Data
  const stages = [
    { id: 1, name: '01. Contrato & Alinhamento', status: 'concluido', responsavel: 'Beatriz Lima', inicio: '01/08', fim: '05/08', progress: 100, duracao: '5 dias' },
    { id: 2, name: '02. Briefing Técnico', status: 'concluido', responsavel: 'Lucas Mendes', inicio: '06/08', fim: '12/08', progress: 100, duracao: '7 dias' },
    { id: 3, name: '03. Estudo Preliminar', status: 'concluido', responsavel: 'Carlos Eduardo', inicio: '13/08', fim: '23/08', progress: 100, duracao: '10 dias' },
    { id: 4, name: '04. Projeto 3D / Render', status: 'em_aprovacao', responsavel: 'Mariana Silva', inicio: '24/08', fim: '03/09', progress: 85, duracao: '10 dias' },
    { id: 5, name: '05. Projeto Executivo', status: 'em_producao', responsavel: 'Carlos Eduardo', inicio: '04/09', fim: '19/09', progress: 35, duracao: '15 dias' },
    { id: 6, name: '06. Detalhamento & Lista', status: 'a_iniciar', responsavel: 'Mariana Silva', inicio: '20/09', fim: '28/09', progress: 0, duracao: '8 dias' },
    { id: 7, name: '07. Entrega Final da Fase', status: 'a_iniciar', responsavel: 'Beatriz Lima', inicio: '29/09', fim: '05/10', progress: 0, duracao: 'Sem prazo' },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'concluido':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Aprovado (Auditado)
          </span>
        )
      case 'em_aprovacao':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Aguardando Cliente
          </span>
        )
      case 'em_producao':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Em Andamento
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> A Iniciar
          </span>
        )
    }
  }

  const faqs = [
    {
      q: 'O que é o Organizeasy e para quem é indicado?',
      a: 'O Organizeasy é a plataforma de gestão operacional e relacionamento com clientes desenvolvida especificamente para escritórios de arquitetura, engenharia civil, design de interiores, consultorias e gestão de projetos. Ele substitui a desordem do WhatsApp e planilhas soltas por um ecossistema com Lista, Kanban, Gantt e um Portal exclusivo para o cliente aprovar entregas.'
    },
    {
      q: 'O meu cliente precisa pagar ou criar conta com senha para aprovar projetos?',
      a: 'Não! Seu cliente acessa através de um Magic Link criptografado e seguro, enviado por WhatsApp ou e-mail. Ele não precisa criar senha, baixar aplicativos ou pagar nada. Ele apenas visualiza a evolução do projeto, baixa arquivos e clica para aprovar as etapas.'
    },
    {
      q: 'Como funciona a auditoria e validade das aprovações?',
      a: 'Quando o cliente aprova uma etapa (como Projeto 3D ou Estudo Preliminar), o Organizeasy grava o carimbo digital com endereço IP, navegador, data e hora exata da ação. Isso cria um histórico inalterável que protege seu escritório contra retrabalhos gratuitos e cobranças de alterações fora do escopo.'
    },
    {
      q: 'Posso personalizar as etapas e modelos de projetos?',
      a: 'Sim! Você pode criar modelos padronizados de projetos para o seu escritório (por exemplo: Modelo Residencial Completo, Modelo Comercial, Consultoria Rápida) e aplicá-los com 1 clique a cada novo cliente.'
    },
    {
      q: 'O Organizeasy serve para escritórios pequenos ou autônomos?',
      a: 'Perfeitamente. O sistema foi projetado para crescer com você: desde profissionais liberais e escritórios boutique até grandes equipes com múltiplos gestores, departamentos e dezenas de projetos simultâneos.'
    },
    {
      q: 'Meus dados e arquivos estão seguros?',
      a: 'Sim. Utilizamos arquitetura em nuvem de ponta com banco de dados seguro, criptografia de ponta a ponta e políticas de isolamento rigorosas (Row Level Security), garantindo que apenas os membros autorizados do seu escritório e seus respectivos clientes acessem cada projeto.'
    }
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased font-sans selection:bg-blue-600 selection:text-white">
      {/* Background Subtle Grid Texture (Originix Trademark Style) */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* 1. TOP NAVBAR (Interativo, Responsivo & Menu Colapsado Estiloso) */}
      <LandingNavbar />

      {/* MAIN CONTAINER */}
      <main className="relative z-10 space-y-24 sm:space-y-32 py-10 sm:py-16">

        {/* 2. HERO SECTION (Originix Style) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Announcement Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs sm:text-sm font-semibold shadow-2xs hover:bg-blue-100/70 transition-colors">
            <Sparkles className="w-4 h-4 text-blue-600 animate-spin-slow" />
            <span>Feito para escritórios de todos os tipos</span>
            <span className="w-1 h-1 rounded-full bg-blue-400" />
            <span className="text-blue-600/80 font-normal">Nova Versão 2.0</span>
          </div>

          {/* Hero Main Headline */}
          <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
              Gestão operacional de projetos e aprovação de clientes com{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600">
                clareza absoluta
              </span>.
            </h1>
            <p className="text-base sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto font-normal">
              Centralize cronogramas em <strong>Lista</strong>, <strong>Kanban</strong> e <strong>Gantt</strong>, elimine o caos das mensagens no WhatsApp e colete aprovações com validade e auditoria no Portal do Cliente.
            </p>
          </div>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Link
              href="/cadastro"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition-all hover:-translate-y-0.5"
            >
              <span>Começar Gratuitamente</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#simulador"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm border border-slate-200/90 shadow-2xs transition-all hover:border-slate-300"
            >
              <Eye className="w-4 h-4 text-blue-600" />
              <span>Ver Simulador Interativo</span>
            </a>
          </div>

          {/* Trust Metrics Bar */}
          <div className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-white/80 p-4 rounded-2xl border border-slate-200/70 shadow-2xs">
              <p className="text-2xl font-extrabold text-blue-600 font-mono">+1.500</p>
              <p className="text-xs text-slate-500 font-medium">Projetos Gerenciados</p>
            </div>
            <div className="bg-white/80 p-4 rounded-2xl border border-slate-200/70 shadow-2xs">
              <p className="text-2xl font-extrabold text-emerald-600 font-mono">99.4%</p>
              <p className="text-xs text-slate-500 font-medium">Aprovações no Prazo</p>
            </div>
            <div className="bg-white/80 p-4 rounded-2xl border border-slate-200/70 shadow-2xs">
              <p className="text-2xl font-extrabold text-slate-800 font-mono">Zero</p>
              <p className="text-xs text-slate-500 font-medium">Ruídos no WhatsApp</p>
            </div>
            <div className="bg-white/80 p-4 rounded-2xl border border-slate-200/70 shadow-2xs">
              <p className="text-2xl font-extrabold text-blue-700 font-mono">100%</p>
              <p className="text-xs text-slate-500 font-medium">Auditoria com IP & Data</p>
            </div>
          </div>

          {/* 3. INTERACTIVE PRODUCT SHOWCASE FRAME (Hero Product Frame) */}
          <div id="simulador" className="pt-10 scroll-mt-24">
            <div className="bg-slate-900 p-2.5 sm:p-3.5 rounded-3xl shadow-2xl border border-slate-800 max-w-5xl mx-auto">
              {/* Window Header / Browser Bar */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 mb-3 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-1 rounded-lg font-mono text-[11px] text-slate-300 border border-slate-700/50">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>organizeasy.app/escritorio/projetos/PRJ-2026-01</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 hidden sm:block">Organizeasy Workspace</div>
              </div>

              {/* White Application Canvas */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 text-left space-y-6 shadow-inner">
                {/* Project Header Info */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                        PRJ-2026-01
                      </span>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                        Expansão Corporativa Alpha
                      </h2>
                      <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                        Em Execução
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Cliente: <strong className="text-slate-700">Carlos Eduardo Mendes</strong> • Prazo Final:{' '}
                      <strong className="text-slate-700">10/11/2026</strong> • Gestor:{' '}
                      <strong className="text-slate-700">Beatriz Lima</strong>
                    </p>
                  </div>

                  {/* Progress Meter */}
                  <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <div className="text-right">
                      <p className="text-[11px] text-slate-500 font-medium">Progresso Global</p>
                      <p className="text-lg font-extrabold text-blue-600 font-mono">55%</p>
                    </div>
                    <div className="w-24 sm:w-32 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full w-[55%]" />
                    </div>
                  </div>
                </div>

                {/* View Switcher Controls (ClickUp Style) */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex p-1 rounded-xl bg-slate-100/90 border border-slate-200">
                    <button
                      onClick={() => setActiveView('lista')}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeView === 'lista'
                          ? 'bg-white text-blue-600 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      <ListTodo className="w-4 h-4" />
                      Lista
                    </button>
                    <button
                      onClick={() => setActiveView('kanban')}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeView === 'kanban'
                          ? 'bg-white text-blue-600 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      <KanbanIcon className="w-4 h-4" />
                      Kanban
                    </button>
                    <button
                      onClick={() => setActiveView('gantt')}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeView === 'gantt'
                          ? 'bg-white text-blue-600 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      <CalendarRange className="w-4 h-4" />
                      Gantt / Timeline
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-medium bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                      <FileText className="w-3.5 h-3.5 text-blue-600" /> 7 Etapas
                    </span>
                    <span className="flex items-center gap-1 font-medium bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-700">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Portal Ativo
                    </span>
                  </div>
                </div>

                {/* DYNAMIC VIEW CONTAINER */}
                <div className="transition-all duration-200">
                  {/* View 1: LISTA */}
                  {activeView === 'lista' && (
                    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                            <tr>
                              <th className="py-3 px-4">#</th>
                              <th className="py-3 px-4">Nome da Etapa</th>
                              <th className="py-3 px-4">Responsável</th>
                              <th className="py-3 px-4">Início</th>
                              <th className="py-3 px-4">Fim</th>
                              <th className="py-3 px-4">Progresso</th>
                              <th className="py-3 px-4">Status de Aprovação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                            {stages.map((st) => (
                              <tr key={st.id} className="hover:bg-blue-50/40 transition-colors">
                                <td className="py-3 px-4 text-slate-400 font-mono text-xs">{st.id}</td>
                                <td className="py-3 px-4 font-bold text-slate-900">{st.name}</td>
                                <td className="py-3 px-4 text-slate-600">{st.responsavel}</td>
                                <td className="py-3 px-4 font-mono text-slate-500">{st.inicio}</td>
                                <td className="py-3 px-4 font-mono text-slate-500">{st.fim}</td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                                      <div className="bg-blue-600 h-full rounded-full" style={{ width: `${st.progress}%` }} />
                                    </div>
                                    <span className="font-mono text-[11px] text-slate-500">{st.progress}%</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4">{getStatusBadge(st.status)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* View 2: KANBAN */}
                  {activeView === 'kanban' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      {/* Coluna 1: A Iniciar */}
                      <div className="bg-slate-100/80 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-slate-400" /> A Iniciar
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full shadow-2xs">2</span>
                        </div>
                        <div className="space-y-2.5">
                          {stages.filter((s) => s.status === 'a_iniciar').map((st) => (
                            <div key={st.id} className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs space-y-1.5 hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                                <span>#{st.id}</span>
                                <span>{st.duracao}</span>
                              </div>
                              <h4 className="text-xs font-bold text-slate-900">{st.name}</h4>
                              <p className="text-[11px] text-slate-500">Resp: {st.responsavel} • Previsão: {st.fim}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Coluna 2: Em Andamento */}
                      <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                          <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500" /> Em Andamento
                          </span>
                          <span className="text-[11px] font-bold text-blue-600 bg-white px-2 py-0.5 rounded-full shadow-2xs">1</span>
                        </div>
                        <div className="space-y-2.5">
                          {stages.filter((s) => s.status === 'em_producao').map((st) => (
                            <div key={st.id} className="bg-white p-3 rounded-lg border border-blue-200 shadow-2xs space-y-2 hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between text-[11px] text-blue-600 font-mono">
                                <span>#{st.id}</span>
                                <span>{st.progress}%</span>
                              </div>
                              <h4 className="text-xs font-bold text-slate-900">{st.name}</h4>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-blue-600 h-full rounded-full" style={{ width: `${st.progress}%` }} />
                              </div>
                              <p className="text-[11px] text-slate-500">Resp: {st.responsavel} • Entrega: {st.fim}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Coluna 3: Em Aprovação do Cliente */}
                      <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-100 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                          <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Em Aprovação
                          </span>
                          <span className="text-[11px] font-bold text-amber-600 bg-white px-2 py-0.5 rounded-full shadow-2xs">1</span>
                        </div>
                        <div className="space-y-2.5">
                          {stages.filter((s) => s.status === 'em_aprovacao').map((st) => (
                            <div key={st.id} className="bg-white p-3 rounded-lg border border-amber-200 shadow-2xs space-y-2 hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between text-[11px] text-amber-600 font-mono">
                                <span>#{st.id}</span>
                                <span className="text-[10px] font-bold uppercase bg-amber-50 px-1.5 py-0.5 rounded-sm">Magic Link</span>
                              </div>
                              <h4 className="text-xs font-bold text-slate-900">{st.name}</h4>
                              <p className="text-[11px] text-slate-600">Visualizado pelo cliente hoje. Aguardando aceite formal.</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Coluna 4: Aprovado (Auditado) */}
                      <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                          <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Aprovado (Auditado)
                          </span>
                          <span className="text-[11px] font-bold text-emerald-600 bg-white px-2 py-0.5 rounded-full shadow-2xs">3</span>
                        </div>
                        <div className="space-y-2.5">
                          {stages.filter((s) => s.status === 'concluido').map((st) => (
                            <div key={st.id} className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs space-y-1.5 hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between text-[11px] text-emerald-700 font-mono">
                                <span>#{st.id}</span>
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              </div>
                              <h4 className="text-xs font-bold text-slate-900">{st.name}</h4>
                              <p className="text-[11px] text-emerald-600 font-medium">Aceite formal registrado no Portal</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* View 3: GANTT */}
                  {activeView === 'gantt' && (
                    <div className="rounded-xl border border-slate-200 p-4 space-y-4 shadow-2xs bg-white">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
                        <span className="font-bold text-slate-800 flex items-center gap-2">
                          <CalendarRange className="w-4 h-4 text-blue-600" /> Cronograma de Linha do Tempo
                        </span>
                        <span className="text-slate-500 font-mono">Agosto — Outubro 2026</span>
                      </div>

                      <div className="space-y-3">
                        {stages.map((st, index) => {
                          const leftOffset = index * 12
                          const barWidth = 18 + (index % 2) * 5

                          return (
                            <div key={st.id} className="grid grid-cols-12 items-center gap-3 py-1.5 border-b border-slate-50 text-xs">
                              <div className="col-span-4 font-semibold text-slate-800 truncate">
                                {st.name}
                              </div>
                              <div className="col-span-8 relative h-7 bg-slate-50 rounded-lg p-1 flex items-center">
                                <div
                                  className={`absolute h-5 rounded-md flex items-center px-2 text-[10px] font-bold text-white transition-all shadow-xs truncate ${st.status === 'concluido'
                                      ? 'bg-emerald-500'
                                      : st.status === 'em_aprovacao'
                                        ? 'bg-amber-500'
                                        : st.status === 'em_producao'
                                          ? 'bg-blue-600'
                                          : 'bg-slate-300 text-slate-700'
                                    }`}
                                  style={{
                                    left: `${leftOffset}%`,
                                    width: `${barWidth}%`,
                                  }}
                                >
                                  {st.inicio} - {st.fim}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. LOGO CLOUD / AUDIENCE PROOF */}
        <section className="border-y border-slate-200/80 bg-white/70 py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              A ferramenta de gestão predileta para escritórios e equipes técnicas
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 items-center justify-center font-semibold text-slate-600 text-xs sm:text-sm">
              <div className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 hover:bg-slate-100/70 transition-colors">
                <Compass className="w-4 h-4 text-blue-600" />
                <span>Arquitetura & Urbanismo</span>
              </div>
              <div className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 hover:bg-slate-100/70 transition-colors">
                <HardHat className="w-4 h-4 text-amber-600" />
                <span>Engenharia & Obras</span>
              </div>
              <div className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 hover:bg-slate-100/70 transition-colors">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Design de Interiores</span>
              </div>
              <div className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 hover:bg-slate-100/70 transition-colors">
                <Building className="w-4 h-4 text-emerald-600" />
                <span>Incorporação Imobiliária</span>
              </div>
              <div className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 hover:bg-slate-100/70 transition-colors col-span-2 sm:col-span-1">
                <Briefcase className="w-4 h-4 text-blue-700" />
                <span>Consultorias Técnicas</span>
              </div>
            </div>
          </div>
        </section>

        {/* 5. BENTO GRID FEATURES SECTION (Originix Style) */}
        <section id="recursos" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 scroll-mt-24">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              <span>Funcionalidades Desenvolvidas para Produtividade</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Tudo o que seu escritório precisa para operar em alto nível
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Elimine gargalos de comunicação, retrabalhos sem cobrança e a desorganização de arquivos soltos.
            </p>
          </div>

          {/* Bento Grid Layout (3x2) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-7 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all hover:-translate-y-1 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Gestão Visual Multiformato</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Alterne entre Lista analítica, Kanban ágil e Linha do Tempo Gantt sem duplicar tarefas. A equipe trabalha com autonomia e o gestor tem visão macro.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-7 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all hover:-translate-y-1 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <Share2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Portal do Cliente com Magic Link</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Chega de senhas perdidas. Seu cliente recebe um link exclusivo para acompanhar entregas, ver imagens e aprovar arquivos com um único toque.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-7 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all hover:-translate-y-1 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <FileCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Auditoria & Blindagem Jurídica</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Cada clique de aprovação registra endereço IP, navegador, data e hora. Elimine pedidos de alterações fora do escopo sem comprovação documental.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-7 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all hover:-translate-y-1 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Prazos e Alertas Inteligentes</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Acompanhe o cronograma em tempo real e identifique gargalos antes que virem atrasos de entrega na obra ou reunião de apresentação.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-7 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all hover:-translate-y-1 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Modelos de Projeto Prontos</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Padronize etapas essenciais como Briefing, Estudo Preliminar, Projeto 3D e Executivo. Inicie novos contratos em menos de 2 minutos.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-7 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all hover:-translate-y-1 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Segurança & RLS Blindado</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Políticas rígidas de Row Level Security garantem isolamento absoluto entre escritórios, colaboradores e clientes. Seus arquivos 100% protegidos.
              </p>
            </div>
          </div>
        </section>

        {/* 6. CLIENT PORTAL SPOTLIGHT (Deep Dive Showcase) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-blue-900 via-slate-900 to-slate-900 rounded-3xl p-8 sm:p-12 text-white border border-slate-800 shadow-xl overflow-hidden relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Left Column: Context & Benefits */}
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
                  <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Experiência Exclusiva do Cliente</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                  Como seu cliente aprova as etapas sem atrito e sem senhas
                </h2>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  Em vez de mensagens perdidas no WhatsApp ou pastas confusas no Google Drive, o cliente recebe um link exclusivo e seguro para visualizar cada entrega e registrar seu aceite formal.
                </p>

                <div className="space-y-3.5 pt-2">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Sem necessidade de cadastro ou senhas</p>
                      <p className="text-xs text-slate-400">Acesso instantâneo via Magic Link criptografado enviado por e-mail ou WhatsApp.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Carimbo Digital de Auditoria</p>
                      <p className="text-xs text-slate-400">Grava IP, data e hora da aprovação para garantia mútua entre cliente e escritório.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Interface 100% responsiva para celular</p>
                      <p className="text-xs text-slate-400">O cliente pode aprovar plantas, memoriais e modelos 3D direto do smartphone.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Portal Mockup Card */}
              <div className="lg:col-span-6">
                <div className="bg-white rounded-2xl p-5 sm:p-7 text-slate-900 shadow-2xl border border-slate-200/90 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                        O
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Portal do Cliente • Organizeasy</h4>
                        <p className="text-[10px] text-slate-500">Projeto: Expansão Corporativa Alpha</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 text-amber-700 rounded-full border border-amber-200 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      Aguardando seu Aceite
                    </span>
                  </div>

                  {/* Stage Card Inside Portal */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Etapa 04: Projeto 3D & Humanização</span>
                      <span className="text-xs font-mono text-slate-500">v2.1 Final</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Olá, Carlos! Os arquivos da volumetria 3D e memorial descritivo dos acabamentos foram disponibilizados para sua revisão final.
                    </p>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-slate-800">Memorial_3D_Acabamentos_Alpha.pdf</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">4.2 MB</span>
                    </div>
                  </div>

                  {/* Client Approval Action Box */}
                  <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Aprovação com Carimbo Digital
                      </span>
                      <span className="text-[10px] font-mono text-emerald-700">Auditável</span>
                    </div>
                    <button className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all">
                      <Check className="w-4 h-4" /> Aprovar Esta Etapa Formalmente
                    </button>
                    <p className="text-[10px] text-slate-500 text-center">
                      Registra: Carlos Eduardo Mendes • IP 187.54.***.** • 15/09/2026 às 14:30
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. PERSONA SHOWCASE TABS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Feito sob medida para todas as pontas do seu negócio
            </h2>
            <p className="text-base text-slate-600">
              Veja como cada integrante se beneficia da clareza operacional do Organizeasy.
            </p>

            {/* Persona Switcher Tabs */}
            <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 border border-slate-200/90 gap-1.5">
              <button
                onClick={() => setActivePersona('gestor')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${activePersona === 'gestor'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Para o Gestor / Titular
              </button>
              <button
                onClick={() => setActivePersona('equipe')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${activePersona === 'equipe'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Para a Equipe Técnica
              </button>
              <button
                onClick={() => setActivePersona('cliente')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${activePersona === 'cliente'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Para o Cliente Final
              </button>
            </div>
          </div>

          {/* Active Persona Card Details */}
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-xs max-w-4xl mx-auto">
            {activePersona === 'gestor' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Visão Executiva & Controle de Prazos</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Acompanhe a saúde de todos os contratos em andamento sem precisar perguntar o status a cada colaborador. Saiba quem está sobrecarregado e antecipe qualquer desvio no cronograma.
                  </p>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-700 font-medium">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" /> Relatórios de progresso em tempo real
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" /> Redução de retrabalho não remunerado
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" /> Segurança jurídica em cada etapa entregue
                    </li>
                  </ul>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 space-y-4">
                  <p className="text-xs font-bold text-slate-400 uppercase">Resumo da Carteira do Escritório</p>
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-900">12 Projetos em Andamento</p>
                        <p className="text-[11px] text-slate-500">100% dos prazos cumpridos este mês</p>
                      </div>
                      <span className="text-emerald-600 font-bold font-mono">Saudável</span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-900">4 Etapas Aguardando Cliente</p>
                        <p className="text-[11px] text-slate-500">Lembretes automáticos ativos</p>
                      </div>
                      <span className="text-amber-600 font-bold font-mono">Notificado</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePersona === 'equipe' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Foco nas Entregas Sem Interrupções</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Arquitetos, projetistas e engenheiros trabalham com listas claras do que precisa ser feito hoje, sem reuniões redundantes de alinhamento ou briefings perdidos em conversas de chat.
                  </p>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-700 font-medium">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" /> Kanban pessoal e da equipe por projeto
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" /> Notificação imediata quando o cliente aprova
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" /> Anexos e arquivos centralizados por fase
                    </li>
                  </ul>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 space-y-4">
                  <p className="text-xs font-bold text-slate-400 uppercase">Minhas Prioridades Hoje</p>
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-600" />
                      <div>
                        <p className="font-bold text-slate-900">Render 3D - Fachada Principal</p>
                        <p className="text-[11px] text-slate-500">Expansão Corporativa Alpha • Entrega: 18h</p>
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <div>
                        <p className="font-bold text-slate-900">Aprovação Recebida: Estudo Preliminar</p>
                        <p className="text-[11px] text-emerald-600 font-medium">Cliente aprovou sem ressalvas via Portal</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePersona === 'cliente' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Transparência e Confiança Absoluta</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    O contratante não precisa cobrar pelo status da obra ou projeto. Ele sabe exatamente o que foi concluído, o que está sendo produzido e tem autonomia para aprovar cada etapa com tranquilidade.
                  </p>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-700 font-medium">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Sem cadastro burocrático ou senhas
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Visualização de arquivos e projetos em alta definição
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Sentimento de profissionalismo e valor agregado
                    </li>
                  </ul>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 space-y-4">
                  <p className="text-xs font-bold text-slate-400 uppercase">Experiência do Cliente no Celular</p>
                  <div className="p-4 bg-white rounded-xl border border-emerald-200 text-xs space-y-2">
                    <div className="flex items-center justify-between text-emerald-700 font-bold">
                      <span>Etapa Aprovada com Sucesso</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-slate-600">
                      Obrigado, Carlos! Sua aprovação foi registrada. A equipe iniciou a fase de detalhamento executivo.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 8. 4-STEP PROCESS (Como Funciona) */}
        <section id="como-funciona" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 scroll-mt-24">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              <span>Passo a Passo Simples</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Como funciona no seu dia a dia
            </h2>
            <p className="text-base text-slate-600">
              Em quatro etapas você profissionaliza a operação do escritório e eleva o padrão das entregas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 relative">
              <span className="text-3xl font-extrabold text-blue-600/30 font-mono">01</span>
              <h3 className="text-base font-bold text-slate-900">Crie seu escritório em 2 minutos</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cadastre sua empresa, insira sua identidade visual e convide os membros da equipe técnica.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 relative">
              <span className="text-3xl font-extrabold text-blue-600/30 font-mono">02</span>
              <h3 className="text-base font-bold text-slate-900">Inicie projetos com etapas prontas</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Utilize templates padrão (Briefing, 3D, Executivo) ou monte o cronograma específico do contrato.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 relative">
              <span className="text-3xl font-extrabold text-blue-600/30 font-mono">03</span>
              <h3 className="text-base font-bold text-slate-900">Compartilhe o link com o cliente</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Envie o Magic Link seguro diretamente no WhatsApp ou e-mail. Zero burocracia para quem contrata.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 relative">
              <span className="text-3xl font-extrabold text-blue-600/30 font-mono">04</span>
              <h3 className="text-base font-bold text-slate-900">Colete aprovações documentadas</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cada entrega aprovada gera histórico permanente com data e IP. Adeus discussões sobre escopo.
              </p>
            </div>
          </div>
        </section>

        {/* 9. COMPARISON MATRIX (Organizeasy vs. Traditional Methods) */}
        <section id="diferenciais" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 scroll-mt-24">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Por que substituir planilhas e WhatsApp pelo Organizeasy?
            </h2>
            <p className="text-base text-slate-600">
              Veja a diferença prática entre ferramentas genéricas e uma solução pensada para escritórios técnicos.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden max-w-5xl mx-auto">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="py-4 px-6 font-bold text-slate-900 w-1/3">Critério de Gestão</th>
                    <th className="py-4 px-6 font-bold text-blue-700 bg-blue-50/50 w-1/3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span>Organizeasy</span>
                      </div>
                    </th>
                    <th className="py-4 px-6 font-bold text-slate-500 w-1/3">WhatsApp / Planilhas / Trello</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-4 px-6 font-semibold text-slate-900">Portal Exclusivo para o Cliente</td>
                    <td className="py-4 px-6 bg-blue-50/30 text-emerald-700 font-semibold flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" /> Sim, sem senhas (Magic Link)
                    </td>
                    <td className="py-4 px-6 text-slate-400 flex items-center gap-1.5">
                      <X className="w-4 h-4 text-rose-500" /> Não existe (mensagens soltas)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-semibold text-slate-900">Auditoria Legal de Aprovação (IP & Data)</td>
                    <td className="py-4 px-6 bg-blue-50/30 text-emerald-700 font-semibold flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" /> Sim, rastreabilidade inalterável
                    </td>
                    <td className="py-4 px-6 text-slate-400 flex items-center gap-1.5">
                      <X className="w-4 h-4 text-rose-500" /> {"Áudios perdidos ou 'ok' informal"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-semibold text-slate-900">Visão Integrada: Lista, Kanban e Gantt</td>
                    <td className="py-4 px-6 bg-blue-50/30 text-emerald-700 font-semibold flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" /> Nativo com sincronização em tempo real
                    </td>
                    <td className="py-4 px-6 text-slate-400 flex items-center gap-1.5">
                      <X className="w-4 h-4 text-rose-500" /> Planilhas desatualizadas ou cartões manuais
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-semibold text-slate-900">Etapas Específicas para Escritórios</td>
                    <td className="py-4 px-6 bg-blue-50/30 text-emerald-700 font-semibold flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" /> Sim (Briefing, 3D, Executivo, RDO)
                    </td>
                    <td className="py-4 px-6 text-slate-400 flex items-center gap-1.5">
                      <X className="w-4 h-4 text-rose-500" /> Ferramentas genéricas exigem setup longo
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-semibold text-slate-900">Blindagem contra Retrabalho não Pago</td>
                    <td className="py-4 px-6 bg-blue-50/30 text-emerald-700 font-semibold flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" /> Histórico claro de versões aprovadas
                    </td>
                    <td className="py-4 px-6 text-slate-400 flex items-center gap-1.5">
                      <X className="w-4 h-4 text-rose-500" /> {"\"Pensei que essa alteração estava inclusa\""}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 10. TESTIMONIALS (Social Proof across all studio types) */}
        <section id="depoimentos" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 scroll-mt-24">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
              <Award className="w-3.5 h-3.5 text-blue-600" />
              <span>Avaliações Reais de Clientes</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Quem usa o Organizeasy não volta para o caos
            </h2>
            <p className="text-base text-slate-600">
              Escritórios de arquitetura, engenharia, design de interiores e consultorias contam seus resultados.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Testimonial 1 */}
            <div className="p-7 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-amber-400">
                  {'★'.repeat(5)}
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                  {"\"O portal do cliente eliminou 80% das mensagens no WhatsApp perguntando 'em que pé está o projeto'. O cliente se sente seguro ao ver o cronograma e aprovar o 3D direto no sistema.\""}
                </p>
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                  CC
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Camila Castanho</h4>
                  <p className="text-[11px] text-slate-500">Arquiteta Titular • Castanho Arquitetura</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="p-7 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-amber-400">
                  {'★'.repeat(5)}
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                  {"\"A auditoria de aprovação com registro de IP e data nos salvou de retrabalhos caros de obra. Quando o cliente solicita uma alteração fora do escopo, temos o histórico aprovado registrado.\""}
                </p>
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-sm">
                  RF
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Rodrigo F. Albuquerque</h4>
                  <p className="text-[11px] text-slate-500">Engenheiro Civil & Gestor • RFA Engenharia</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="p-7 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-amber-400">
                  {'★'.repeat(5)}
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                  {"\"Migramos de planilhas e Trello em um único dia. As três visões (Gantt, Lista e Kanban) deram clareza imediata para a equipe inteira sobre as entregas da semana.\""}
                </p>
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">
                  PL
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Patrícia Lacerda</h4>
                  <p className="text-[11px] text-slate-500">Designer de Interiores • Studio Lacerda</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 11. FAQ ACCORDION */}
        <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 scroll-mt-24">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Perguntas Frequentes
            </h2>
            <p className="text-base text-slate-600">
              Tire suas dúvidas sobre o funcionamento do Organizeasy.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index
              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-slate-900 hover:text-blue-600 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''
                        }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* 12. HIGH-CONVERSION CTA BANNER */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-8 sm:p-14 text-white text-center space-y-6 shadow-2xl relative overflow-hidden">
            {/* Background Decorative Pattern */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#FFF_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

            <div className="max-w-2xl mx-auto space-y-4 relative z-10">
              <span className="px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold uppercase tracking-wider text-blue-100">
                Comece em 2 Minutos
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
                Pronto para transformar a gestão do seu escritório?
              </h2>
              <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
                Junte-se a escritórios de todos os tipos que já eliminaram o ruído de comunicação e profissionalizaram suas entregas com o Organizeasy.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5 relative z-10">
              <Link
                href="/cadastro"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white hover:bg-blue-50 text-blue-900 font-extrabold text-sm shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Criar Escritório Gratuitamente</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-blue-800/60 hover:bg-blue-800 text-white font-bold text-sm border border-blue-400/30 transition-all"
              >
                <span>Já tenho escritório</span>
              </Link>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-blue-200/90 relative z-10 font-medium">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-300" /> Sem necessidade de cartão de crédito
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-300" /> Configuração rápida em 2 minutos
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-300" /> Portal do Cliente ilimitado
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* 13. COMPREHENSIVE FOOTER */}
      <footer className="bg-white border-t border-slate-200/80 pt-14 pb-8 px-4 sm:px-6 lg:px-8 mt-16 relative z-10">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Col 1: Brand & Bio */}
            <div className="space-y-4 md:col-span-1">
              <Link href="/" className="inline-block">
                <Image
                  src="/logos/logo-organize.webp"
                  alt="Organizeasy"
                  width={140}
                  height={32}
                  className="h-7 w-auto object-contain"
                />
              </Link>
              <p className="text-xs text-slate-500 leading-relaxed">
                A plataforma inteligente de gestão operacional e aprovação de clientes com validade e auditoria para escritórios técnicos de todos os tipos.
              </p>
              <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 w-fit">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Todos os sistemas operacionais</span>
              </div>
            </div>

            {/* Col 2: Produto & Recursos */}
            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Produto</h4>
              <ul className="space-y-2 text-slate-600">
                <li><a href="#simulador" className="hover:text-blue-600 transition-colors">Visão em Lista</a></li>
                <li><a href="#simulador" className="hover:text-blue-600 transition-colors">Visão Kanban</a></li>
                <li><a href="#simulador" className="hover:text-blue-600 transition-colors">Cronograma Gantt</a></li>
                <li><a href="#recursos" className="hover:text-blue-600 transition-colors">Portal do Cliente</a></li>
                <li><a href="#diferenciais" className="hover:text-blue-600 transition-colors">Auditoria Digital</a></li>
              </ul>
            </div>

            {/* Col 3: Acesso Rápido */}
            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Acesso Rápido</h4>
              <ul className="space-y-2 text-slate-600">
                <li><Link href="/cadastro" className="hover:text-blue-600 transition-colors">Criar Escritório</Link></li>
                <li><Link href="/login" className="hover:text-blue-600 transition-colors">Área do Escritório</Link></li>
                <li><Link href="/portal/login" className="hover:text-blue-600 transition-colors">Acompanhar meu Projeto</Link></li>
                <li><Link href="/recuperar-senha" className="hover:text-blue-600 transition-colors">Recuperar Senha</Link></li>
              </ul>
            </div>

            {/* Col 4: Conformidade & Informações */}
            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Segurança & Legal</h4>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Row Level Security (RLS)
                </li>
                <li className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" /> Criptografia de Ponta a Ponta
                </li>
                <li><Link href="/sitemap.xml" className="hover:text-blue-600 transition-colors">Sitemap</Link></li>
              </ul>
            </div>
          </div>

          {/* Copyright & Bottom bar */}
          <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} Organizeasy. Todos os direitos reservados.</p>
            <p className="text-[11px] text-slate-400">Desenvolvido com excelência para escritórios de alto padrão.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
