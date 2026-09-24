'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, ShieldCheck, AlertCircle, FolderGit2 } from 'lucide-react'
import { verifyProjectPortalAccessCodeAction } from '@/lib/actions/client-portal-auth'

interface ProjectPortalCodeChallengeProps {
  projectToken: string
  project: {
    id: string
    title: string
    code: string
  }
  office: {
    name: string
    logo_url: string | null
    phone?: string | null
    email?: string | null
  }
}

export default function ProjectPortalCodeChallenge({
  projectToken,
  project,
  office,
}: ProjectPortalCodeChallengeProps) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCode = code.trim().toUpperCase()
    if (!cleanCode) {
      setError('Por favor, informe seu código de acesso.')
      return
    }

    setLoading(true)
    setError(null)

    const res = await verifyProjectPortalAccessCodeAction(projectToken, cleanCode)

    if (res.success) {
      router.refresh()
    } else {
      setError(res.error || 'Código incorreto ou não autorizado para este projeto.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Office Branding */}
        <div className="flex justify-center">
          {office.logo_url ? (
            <img
              src={office.logo_url}
              alt={office.name}
              className="h-16 w-auto object-contain rounded-2xl p-1 bg-white border border-slate-200 shadow-sm"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center p-2">
              <img
                src="/logos/logo-organizeasy-quadrado.webp"
                alt={office.name}
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </div>

        <h2 className="mt-4 text-center text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          {office.name}
        </h2>
        <p className="mt-1 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
          Portal do Cliente • Acompanhamento de Projeto
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-8 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 space-y-6">
          {/* Project Identification Badge */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono font-bold text-blue-600 uppercase tracking-wider block">
                {project.code}
              </span>
              <h3 className="text-sm font-bold text-slate-900 truncate">
                {project.title}
              </h3>
            </div>
          </div>

          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
              <ShieldCheck className="w-3.5 h-3.5" /> Identificação Obrigatória
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pt-2">
              Informe o seu <strong>Código de Acesso</strong> para se identificar e liberar a visualização e aprovação deste projeto.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="accessCode" className="block text-xs font-bold uppercase tracking-wider text-slate-600 text-center mb-2">
                Seu Código de Acesso (6 caracteres)
              </label>
              <div className="relative">
                <input
                  id="accessCode"
                  name="accessCode"
                  type="text"
                  maxLength={8}
                  autoComplete="off"
                  autoFocus
                  placeholder="EX: K7X9B2"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full text-center tracking-[6px] font-mono text-xl sm:text-2xl font-bold py-3.5 px-4 rounded-2xl border-2 border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-sm placeholder:font-medium placeholder:text-slate-400 uppercase"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || code.trim().length === 0}
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verificando...
                </>
              ) : (
                <>
                  Entrar no Projeto <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500 space-y-1">
            <p>Não possui seu código de acesso?</p>
            <p className="font-semibold text-slate-700">
              Solicite ao escritório {office.phone ? `(${office.phone})` : ''} para recebê-lo em seu e-mail.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-400 font-medium">
          Organizeasy • Acompanhamento Seguro de Projetos
        </p>
      </div>
    </div>
  )
}
