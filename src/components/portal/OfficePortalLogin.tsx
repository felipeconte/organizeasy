/* eslint-disable @next/next/no-img-element */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  KeyRound,
  Mail,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Building2,
  Phone,
  ShieldCheck,
} from 'lucide-react'
import {
  loginOfficePortalWithCodeAction,
  requestOfficePortalEmailCodeAction,
} from '@/lib/actions/client-portal-auth'

interface OfficePortalLoginProps {
  office: {
    id: string
    name: string
    slug: string
    logo_url: string | null
    phone: string | null
    email: string | null
    cau_caubr?: string | null
    professional_council_id?: string | null
  }
  redirectUrl?: string
}

export default function OfficePortalLogin({ office, redirectUrl }: OfficePortalLoginProps) {
  const router = useRouter()
  const [mode, setMode] = useState<'code' | 'email'>('code')

  // Estado Modo Código
  const [accessCode, setAccessCode] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)

  // Estado Modo E-mail
  const [emailInput, setEmailInput] = useState('')
  const [requestingEmail, setRequestingEmail] = useState(false)
  const [emailMessage, setEmailMessage] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)

  const councilText = office.professional_council_id || office.cau_caubr
  const rawPhoneDigits = office.phone ? office.phone.replace(/\D/g, '') : ''
  const officeWhatsapp = rawPhoneDigits.length >= 10 ? `https://wa.me/55${rawPhoneDigits}` : null

  const handleLoginWithCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = accessCode.trim().toUpperCase()
    if (!clean) {
      setCodeError('Digite o código de acesso fornecido pelo escritório.')
      return
    }

    setLoggingIn(true)
    setCodeError(null)

    try {
      const res = await loginOfficePortalWithCodeAction(office.slug, clean)
      if (res.success) {
        if (redirectUrl) {
          router.push(redirectUrl)
        } else {
          router.refresh()
        }
      } else {
        setCodeError(res.error || 'Código incorreto ou não localizado para este escritório.')
        setLoggingIn(false)
      }
    } catch {
      setCodeError('Erro ao validar acesso. Verifique sua conexão e tente novamente.')
      setLoggingIn(false)
    }
  }

  const handleRequestEmailCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = emailInput.trim().toLowerCase()
    if (!clean || !clean.includes('@')) {
      setEmailError('Informe um e-mail válido.')
      return
    }

    setRequestingEmail(true)
    setEmailError(null)
    setEmailMessage(null)

    try {
      const res = await requestOfficePortalEmailCodeAction(office.slug, clean)
      if (res.success) {
        setEmailMessage(res.message || 'Código enviado com sucesso para o seu e-mail!')
        // Aguarda 1.5s e muda para o modo de digitar o código
        setTimeout(() => {
          setMode('code')
          setCodeError(null)
        }, 2000)
      } else {
        setEmailError(res.error || 'Não foi possível localizar este e-mail no escritório.')
      }
    } catch {
      setEmailError('Erro ao solicitar código. Tente novamente.')
    } finally {
      setRequestingEmail(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 text-slate-800 flex flex-col justify-center items-center py-10 px-4 sm:px-6 antialiased">
      {/* 1. TOPO: BRANDING DO ESCRITÓRIO (ALINHADO À LARGURA DO COMPONENTE DE LOGIN) */}
      <header className="max-w-md w-full mx-auto text-center">
        <div className="flex flex-col items-center gap-3.5">
          {office.logo_url ? (
            <img
              src={office.logo_url}
              alt={office.name}
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-3xl bg-white p-2.5 sm:p-3 shadow-md border border-slate-200/90"
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white border border-slate-200/90 p-3 sm:p-4 flex items-center justify-center shadow-md text-blue-600">
              <Building2 className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
          )}

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {office.name}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 mt-1.5 font-medium">
              Portal do Cliente • Acompanhamento de Projetos
            </p>
            {councilText && (
              <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                Registro: {councilText}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* 2. CARD CENTRAL DE AUTENTICAÇÃO (ESPAÇAMENTO OTIMIZADO) */}
      <main className="max-w-md w-full mx-auto mt-5 sm:mt-6">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xl shadow-slate-200/50 space-y-6">
          {/* Seletor de Modo */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
            <button
              type="button"
              onClick={() => {
                setMode('code')
                setCodeError(null)
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'code'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Código de Acesso</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('email')
                setEmailError(null)
                setEmailMessage(null)
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'email'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Receber por E-mail</span>
            </button>
          </div>

          {/* MODO 1: DIGITAR CÓDIGO */}
          {mode === 'code' ? (
            <form onSubmit={handleLoginWithCode} className="space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-base font-bold text-slate-900">Informe seu Código</h2>
                <p className="text-xs text-slate-500">
                  Digite o código de 6 caracteres fornecido pelo escritório.
                </p>
              </div>

              {codeError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{codeError}</span>
                </div>
              )}

              {emailMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{emailMessage}</span>
                </div>
              )}

              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    maxLength={10}
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    placeholder="EX: K7X9B2"
                    autoFocus
                    className="w-full text-center font-mono text-2xl font-bold tracking-[0.25em] px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all uppercase"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loggingIn || !accessCode.trim()}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 text-white text-sm font-bold transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <span>Acessar Meus Projetos</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('email')
                    setCodeError(null)
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 transition-colors font-semibold cursor-pointer"
                >
                  Não sabe seu código? Receber por e-mail →
                </button>
              </div>
            </form>
          ) : (
            /* MODO 2: RECEBER CÓDIGO POR E-MAIL */
            <form onSubmit={handleRequestEmailCode} className="space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-base font-bold text-slate-900">Receber Código de Acesso</h2>
                <p className="text-xs text-slate-500">
                  Informe o seu e-mail cadastrado junto a este escritório para receber seu código.
                </p>
              </div>

              {emailError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{emailError}</span>
                </div>
              )}

              {emailMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{emailMessage}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Seu E-mail Cadastrado
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="exemplo@cliente.com.br"
                    autoFocus
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={requestingEmail || !emailInput.trim()}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 text-white text-sm font-bold transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                {requestingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando código...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Enviar Código por E-mail</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('code')
                    setEmailError(null)
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700 transition-colors font-medium cursor-pointer"
                >
                  ← Já tenho meu código de acesso
                </button>
              </div>
            </form>
          )}

          {/* Dica de Segurança */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Acesso individual seguro e criptografado</span>
          </div>
        </div>
      </main>

      {/* 3. RODAPÉ E CONTATOS DO ESCRITÓRIO */}
      <footer className="max-w-md w-full mx-auto mt-6 sm:mt-8 pb-4 text-center space-y-3">
        {officeWhatsapp && (
          <div>
            <a
              href={officeWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-semibold hover:bg-emerald-100 transition-all shadow-xs"
            >
              <Phone className="w-3 h-3" /> Falar com o escritório via WhatsApp
            </a>
          </div>
        )}

        <p className="text-[11px] text-slate-500">
          Organizeasy • Gestão Inteligente para Escritórios de Arquitetura & Engenharia
        </p>
      </footer>
    </div>
  )
}
