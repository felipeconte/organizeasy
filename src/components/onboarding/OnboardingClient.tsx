'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Users,
  ArrowRight,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RefreshCw,
  LogOut,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import {
  createOfficeWithDefaultProfilesAction,
  acceptOfficeInviteAction,
  joinOfficeByCodeAction,
  getPendingInvitesForUserAction,
} from '@/lib/actions/access-profiles'
import { logoutAction } from '@/lib/actions/auth'
import { OrganizationInvite } from '@/types/profiles'

interface OnboardingClientProps {
  user: {
    id: string
    email: string
    name: string
  }
  initialInvites: OrganizationInvite[]
}

export default function OnboardingClient({ user, initialInvites }: OnboardingClientProps) {
  const router = useRouter()
  const [selectedFlow, setSelectedFlow] = useState<'create' | 'join' | null>(null)

  // Estados de Criação
  const [officeName, setOfficeName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Estados de Participação
  const [invites, setInvites] = useState<OrganizationInvite[]>(initialInvites)
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [refreshingInvites, setRefreshingInvites] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  // Submissão: Criar Escritório
  const handleCreateOffice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!officeName.trim()) return

    setCreating(true)
    setCreateError(null)

    const res = await createOfficeWithDefaultProfilesAction(officeName.trim())

    if (!res.success) {
      setCreateError(res.error || 'Não foi possível criar o escritório.')
      setCreating(false)
    } else {
      router.push('/app')
      router.refresh()
    }
  }

  // Submissão: Aceitar Convite Pendente
  const handleAcceptInvite = async (inviteId: string) => {
    setJoining(true)
    setJoinError(null)

    const res = await acceptOfficeInviteAction(inviteId)

    if (!res.success) {
      setJoinError(res.error || 'Falha ao aceitar o convite.')
      setJoining(false)
    } else {
      router.push('/app')
      router.refresh()
    }
  }

  // Submissão: Entrar com Código
  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim()) return

    setJoining(true)
    setJoinError(null)

    const res = await joinOfficeByCodeAction(inviteCode.trim())

    if (!res.success) {
      setJoinError(res.error || 'Código inválido ou expirado.')
      setJoining(false)
    } else {
      router.push('/app')
      router.refresh()
    }
  }

  // Atualizar lista de convites
  const handleRefreshInvites = async () => {
    setRefreshingInvites(true)
    const res = await getPendingInvitesForUserAction()
    if (res.success && res.invites) {
      setInvites(res.invites)
    }
    setRefreshingInvites(false)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between antialiased">
      {/* Topo / Navbar */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs shadow-blue-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold text-slate-900 tracking-tight">Orgarq</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden sm:inline">
            Conectado como <strong className="text-slate-800 font-semibold">{user.email}</strong>
          </span>
          <button
            onClick={async () => {
              setLoggingOut(true)
              await logoutAction()
            }}
            disabled={loggingOut}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            title="Sair da conta"
          >
            {loggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-5xl mx-auto w-full">
        {/* Cabeçalho */}
        <div className="text-center max-w-xl mx-auto mb-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Configuração Inicial</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Olá, {user.name}! Como deseja começar?
          </h1>
          <p className="text-sm text-slate-600">
            Você ainda não está associado a nenhum escritório de arquitetura. Escolha uma das opções abaixo para prosseguir:
          </p>
        </div>

        {/* Cards de Escolha */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {/* Opção 1: Criar novo escritório */}
          <div
            className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col ${
              selectedFlow === 'create'
                ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-lg'
                : 'border-slate-200/90 hover:border-slate-300 hover:shadow-md'
            }`}
          >
            <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 border border-blue-100">
                  <Building2 className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-1.5">
                  Criar um novo escritório
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                  Ideal se você é titular ou sócio e deseja gerenciar seus projetos, equipe, financeiro e clientes.
                </p>

                <ul className="space-y-2.5 mb-6 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Você será o <strong>Proprietário</strong> com controle total</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Template padrão com as 10 etapas da arquitetura</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Perfis de equipe prontos (Administrador, Colaborador, Estagiário)</span>
                  </li>
                </ul>
              </div>

              {selectedFlow === 'create' ? (
                <form onSubmit={handleCreateOffice} className="space-y-4 pt-4 border-t border-slate-100">
                  {createError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{createError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nome do Escritório / Estúdio
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={officeName}
                      onChange={(e) => setOfficeName(e.target.value)}
                      placeholder="Ex: Studio Forma Arquitetura"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="submit"
                      disabled={creating || !officeName.trim()}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      {creating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Criando escritório...</span>
                        </>
                      ) : (
                        <>
                          <span>Criar Escritório e Entrar</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFlow(null)}
                      className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedFlow('create')}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <span>Quero criar meu escritório</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Opção 2: Participar de um escritório */}
          <div
            className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col ${
              selectedFlow === 'join'
                ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-lg'
                : 'border-slate-200/90 hover:border-slate-300 hover:shadow-md'
            }`}
          >
            <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 border border-indigo-100">
                  <Users className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-1.5">
                  Participar de um escritório
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
                  O ingresso em um escritório é realizado <strong>exclusivamente por convite</strong> enviado pelo proprietário ou administrador.
                </p>

                {/* Se existirem convites pendentes */}
                {invites.length > 0 ? (
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span className="flex items-center gap-1.5 text-emerald-600">
                        <Mail className="w-3.5 h-3.5" />
                        <span>Convites encontrados para seu e-mail:</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleRefreshInvites}
                        disabled={refreshingInvites}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Atualizar convites"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshingInvites ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    {invites.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {inv.organization?.name || 'Escritório de Arquitetura'}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Cargo no escritório:{' '}
                            <span className="font-semibold text-slate-700">
                              {inv.profile?.name || 'Colaborador'}
                            </span>
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={joining}
                          onClick={() => handleAcceptInvite(inv.id)}
                          className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-2xs"
                        >
                          {joining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Aceitar e Entrar'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-blue-600" />
                        Aguardando convite?
                      </span>
                      <button
                        type="button"
                        onClick={handleRefreshInvites}
                        disabled={refreshingInvites}
                        className="text-blue-600 hover:underline flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${refreshingInvites ? 'animate-spin' : ''}`} />
                        <span>Verificar convites</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Peça ao administrador do escritório para convidar o e-mail{' '}
                      <strong className="text-slate-800 font-semibold">{user.email}</strong> em <em>Configurações &gt; Perfil do Escritório</em>.
                      Assim que for enviado, você receberá um e-mail com o link de acesso direto e o convite aparecerá automaticamente aqui.
                    </p>
                  </div>
                )}
              </div>

              {selectedFlow === 'join' ? (
                <form onSubmit={handleJoinByCode} className="space-y-4 pt-4 border-t border-slate-100">
                  {joinError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{joinError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Código de Convite (ex: ORG-84920)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        autoFocus
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        placeholder="ORG-XXXXX"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm uppercase font-mono tracking-wider text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="submit"
                      disabled={joining || !inviteCode.trim()}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      {joining ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Validando código...</span>
                        </>
                      ) : (
                        <>
                          <span>Validar e Entrar</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFlow(null)}
                      className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedFlow('join')}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-slate-500" />
                  <span>Tenho um código de convite</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Rodapé simples */}
      <footer className="py-4 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} Orgarq. Todos os direitos reservados.
      </footer>
    </div>
  )
}
