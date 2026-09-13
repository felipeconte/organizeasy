import React from 'react'
import Link from 'next/link'
import { ShieldAlert, ArrowLeft, Home, FolderGit2 } from 'lucide-react'

interface AccessDeniedProps {
  moduleName?: string
  title?: string
  message?: string
  userProfileName?: string
  userProfileColor?: string
  description?: string
  backHref?: string
}

export default function AccessDenied({
  moduleName,
  title,
  message,
  userProfileName = 'Membro',
  userProfileColor = '#64748B',
  description,
  backHref = '/app',
}: AccessDeniedProps) {
  const displayModuleName = moduleName || title || 'Módulo Restrito'
  const displayDescription =
    description ||
    message ||
    `Você não tem permissão para acessar ${displayModuleName}. Entre em contato com o proprietário do escritório para solicitar acesso.`
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 antialiased">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-8 text-center relative overflow-hidden">
        {/* Top Decorative Ambient Gradient */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500" />

        {/* Shield Icon Container */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shadow-inner mb-6">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Profile Pill Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 mb-4">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: userProfileColor }}
          />
          <span>Perfil Ativo: <strong>{userProfileName}</strong></span>
        </div>

        {/* Title & Description */}
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2">
          {title || (moduleName ? `Acesso a ${moduleName} bloqueado` : 'Acesso bloqueado')}
        </h2>

        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          {displayDescription}
        </p>

        <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl text-xs text-slate-500 leading-relaxed text-left mb-6">
          <p>
            Caso necessite utilizar esta funcionalidade, solicite ao <strong>Proprietário</strong> ou <strong>Administrador</strong> do escritório para atualizar as permissões do seu perfil.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={backHref}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Voltar ao Início</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
