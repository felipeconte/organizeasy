import Link from 'next/link'
import { Building2, KeyRound, ArrowRight, ShieldCheck } from 'lucide-react'

export default function CustomerPortalLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-slate-900 text-white mx-auto flex items-center justify-center shadow-lg">
          <Building2 className="w-8 h-8 text-blue-400" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Portal do Cliente
        </h1>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Orgarq Architecture OS
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-8 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 space-y-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
            <KeyRound className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">
              Acesso Exclusivo via Magic Link
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              O acesso aos seus projetos de arquitetura agora é simplificado e não exige login com senha.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 text-left space-y-2">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Verifique o link direto enviado pelo seu escritório por e-mail ou WhatsApp.</span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Utilize o Código de Acesso recebido para visualizar seus projetos com total segurança.</span>
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-400">
            Dúvidas? Entre em contato diretamente com a equipe do seu escritório de arquitetura.
          </div>
        </div>
      </div>
    </div>
  )
}
