'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Lock,
  User,
  Mail,
  Eye,
  EyeOff,
  LogOut,
} from 'lucide-react'
import {
  acceptOfficeInviteAction,
  registerAndAcceptInviteAction,
} from '@/lib/actions/access-profiles'
import { logoutAction } from '@/lib/actions/auth'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface InviteDetails {
  id: string
  email: string
  organization_id: string
  organization_name: string
  organization_logo: string | null
  profile_id: string | null
  profile_name: string
  profile_color: string
  profile_description: string | null
  inviter_name: string | null
  status: string
  expires_at: string | null
}

interface CurrentUser {
  id: string
  email: string
  name: string
}

interface InviteAcceptanceClientProps {
  invite: InviteDetails
  currentUser: CurrentUser | null
}

export default function InviteAcceptanceClient({
  invite,
  currentUser,
}: InviteAcceptanceClientProps) {
  const router = useRouter()
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register')

  // Estados de formulário
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Já aceito
  if (invite.status === 'accepted') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-slate-800 antialiased">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl text-center space-y-5 animate-in zoom-in-95">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-900">Convite Já Aceito</h1>
            <p className="text-sm text-slate-600">
              Você já faz parte da equipe de{' '}
              <strong className="text-slate-800">{invite.organization_name}</strong>.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => router.push('/app')}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <span>Acessar Painel do Escritório</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 1. Caso o usuário já esteja autenticado
  const handleAcceptLoggedIn = async () => {
    setLoading(true)
    setError(null)

    const res = await acceptOfficeInviteAction(invite.id)

    if (!res.success) {
      setError(res.error || 'Não foi possível aceitar o convite.')
      setLoading(false)
    } else {
      setSuccessMessage('Convite aceito com sucesso! Redirecionando...')
      setTimeout(() => {
        router.push('/app')
        router.refresh()
      }, 1000)
    }
  }

  // 2. Caso novo usuário (Criar conta e aceitar)
  const handleRegisterAndAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !password) return

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    setLoading(true)
    setError(null)

    const res = await registerAndAcceptInviteAction({
      inviteId: invite.id,
      fullName: fullName.trim(),
      password,
    })

    if (!res.success) {
      setError(res.error || 'Falha ao criar sua conta.')
      if (res.code === 'USER_EXISTS') {
        setAuthMode('login')
      }
      setLoading(false)
      return
    }

    // Faz o login no navegador com as credenciais criadas
    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password,
      })

      if (signInError) {
        // Redireciona para o login caso ocorra algum problema de sessão
        router.push(`/login?email=${encodeURIComponent(invite.email)}&inviteSuccess=true`)
        return
      }

      setSuccessMessage('Conta criada e convite aceito com sucesso! Entrando...')
      setTimeout(() => {
        router.push('/app')
        router.refresh()
      }, 800)
    } catch {
      router.push('/app')
    }
  }

  // 3. Caso usuário já cadastrado (Fazer login e aceitar)
  const handleLoginAndAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password,
      })

      if (signInError) {
        setError('Senha incorreta. Verifique os dados ou solicite redefinição.')
        setLoading(false)
        return
      }

      // Aceita o convite após login
      const acceptRes = await acceptOfficeInviteAction(invite.id)
      if (!acceptRes.success) {
        setError(acceptRes.error || 'Erro ao vincular ao escritório.')
        setLoading(false)
        return
      }

      setSuccessMessage('Login realizado e convite aceito! Entrando...')
      setTimeout(() => {
        router.push('/app')
        router.refresh()
      }, 800)
    } catch (err: any) {
      setError(err?.message || 'Falha ao realizar login.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between p-4 sm:p-6 text-slate-800 antialiased">
      {/* Topo / Marca */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between py-2">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs shadow-blue-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold text-slate-900 tracking-tight">Orgarq</span>
        </Link>

        {currentUser && (
          <button
            onClick={async () => {
              await logoutAction()
            }}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
            title="Sair da conta"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        )}
      </header>

      {/* Card Central */}
      <main className="max-w-lg w-full mx-auto my-auto py-6">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
          {/* Header do Card com Identificação do Escritório */}
          <div className="bg-gradient-to-b from-blue-50/70 to-transparent p-6 sm:p-8 text-center border-b border-slate-100 space-y-4">
            {/* Logo do Escritório */}
            <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200/80 shadow-md flex items-center justify-center mx-auto overflow-hidden">
              {invite.organization_logo ? (
                <img
                  src={invite.organization_logo}
                  alt={invite.organization_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-8 h-8 text-blue-600" />
              )}
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                Convite de Equipe
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {invite.organization_name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
                {invite.inviter_name
                  ? `${invite.inviter_name} convidou você para colaborar nos projetos do escritório.`
                  : 'Você foi convidado(a) para colaborar nos projetos do escritório.'}
              </p>
            </div>

            {/* Perfil atribuído */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Cargo de Acesso:</span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded text-white"
                style={{ backgroundColor: invite.profile_color }}
              >
                {invite.profile_name}
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            {/* Notificações de Erro / Sucesso */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* SE JÁ ESTIVER LOGADO */}
            {currentUser ? (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Sua conta atual:</span>
                    <span className="font-bold text-slate-900">{currentUser.email}</span>
                  </div>
                  {currentUser.email.toLowerCase() !== invite.email.toLowerCase() && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 leading-relaxed">
                      ⚠️ O convite foi direcionado para <strong>{invite.email}</strong>. Se aceitar com esta conta, ela será vinculada ao escritório.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleAcceptLoggedIn}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Aceitando convite...</span>
                    </>
                  ) : (
                    <>
                      <span>Aceitar Convite e Entrar no Escritório</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* SE NÃO ESTIVER LOGADO: TABS DE REGISTRO / LOGIN */
              <div className="space-y-5">
                {/* Switch Tabs */}
                <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register')
                      setError(null)
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      authMode === 'register'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Criar Minha Conta
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login')
                      setError(null)
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      authMode === 'login'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Já tenho uma conta
                  </button>
                </div>

                {authMode === 'register' ? (
                  /* FORMULÁRIO DE CADASTRO E ACEITE */
                  <form onSubmit={handleRegisterAndAccept} className="space-y-4 text-sm">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        E-mail do Convite
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          disabled
                          value={invite.email}
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-600 font-mono cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Seu Nome Completo *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          autoFocus
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Ex: João da Silva"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Crie sua Senha de Acesso *
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Mínimo de 6 caracteres"
                          className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        Você usará este e-mail e senha para acessar o Orgarq.
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !fullName.trim() || !password}
                      className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer pt-3"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Criando conta e ativando acesso...</span>
                        </>
                      ) : (
                        <>
                          <span>Criar Conta e Entrar na Equipe</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* FORMULÁRIO DE LOGIN E ACEITE */
                  <form onSubmit={handleLoginAndAccept} className="space-y-4 text-sm">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        E-mail Cadastrado
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          disabled
                          value={invite.email}
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-600 font-mono cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Sua Senha do Orgarq *
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoFocus
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Digite sua senha"
                          className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !password}
                      className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer pt-3"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Entrando e aceitando convite...</span>
                        </>
                      ) : (
                        <>
                          <span>Entrar e Fazer Parte da Equipe</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Rodapé simples */}
      <footer className="text-center text-xs text-slate-400 py-2">
        &copy; {new Date().getFullYear()} Orgarq Architecture OS. Todos os direitos reservados.
      </footer>
    </div>
  )
}
