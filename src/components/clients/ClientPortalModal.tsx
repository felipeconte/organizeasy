'use client'

import React, { useState, useEffect } from 'react'
import {
  Globe,
  Copy,
  Check,
  ExternalLink,
  Mail,
  RefreshCw,
  ShieldCheck,
  User,
  AlertCircle,
  Loader2,
  Building2,
  X,
} from 'lucide-react'
import {
  ClientData,
  resendClientPortalAccessAction,
  regenerateAndSendClientAccessCodeAction,
} from '@/lib/actions/clients'
import { useConfirm } from '@/components/ui/ConfirmDialog'

export interface ClientPortalModalProps {
  isOpen: boolean
  onClose: () => void
  client: ClientData
  orgSlug?: string
}

export default function ClientPortalModal({
  isOpen,
  onClose,
  client,
  orgSlug,
}: ClientPortalModalProps) {
  const confirm = useConfirm()
  const [copiedLink, setCopiedLink] = useState(false)
  const [loadingType, setLoadingType] = useState<'resend' | 'regenerate' | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const portalToken = client.portal_token || ''
  const portalUrl = orgSlug
    ? (typeof window !== 'undefined' ? `${window.location.origin}/portal/${orgSlug}` : `/portal/${orgSlug}`)
    : (portalToken
      ? (typeof window !== 'undefined' ? `${window.location.origin}/portal/${portalToken}` : `/portal/${portalToken}`)
      : '')

  const handleCopyLink = () => {
    if (!portalUrl) return
    navigator.clipboard.writeText(portalUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const handleResendAccess = async () => {
    if (!client.email) {
      setErrorMessage('Este cliente não possui um e-mail cadastrado. Atualize o cadastro antes de reenviar.')
      setFeedbackMessage(null)
      return
    }

    setLoadingType('resend')
    setErrorMessage(null)
    setFeedbackMessage(null)

    const res = await resendClientPortalAccessAction(client.id)
    setLoadingType(null)

    if (res.success) {
      setFeedbackMessage(res.message || 'Código de acesso enviado com sucesso para o e-mail do cliente.')
    } else {
      setErrorMessage(res.error || 'Falha ao enviar código de acesso.')
    }
  }

  const handleRegenerateCode = async () => {
    if (!client.email) {
      setErrorMessage('Este cliente não possui um e-mail cadastrado. Atualize o cadastro antes de gerar o código.')
      setFeedbackMessage(null)
      return
    }

    const confirmed = await confirm({
      title: 'Gerar Novo Código de Acesso',
      message: `Deseja realmente gerar um NOVO código de acesso para ${client.name}?`,
      description: 'O código anterior deixará de funcionar imediatamente para novos acessos ao portal.',
      confirmText: 'Gerar Novo Código',
      cancelText: 'Cancelar',
      variant: 'warning',
    })
    if (!confirmed) return

    setLoadingType('regenerate')
    setErrorMessage(null)
    setFeedbackMessage(null)

    const res = await regenerateAndSendClientAccessCodeAction(client.id)
    setLoadingType(null)

    if (res.success) {
      setFeedbackMessage(res.message || 'Novo código gerado e enviado com sucesso para o cliente.')
    } else {
      setErrorMessage(res.error || 'Falha ao gerar novo código.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[calc(100dvh-2rem)] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header do Modal */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/60 shadow-xs">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-900">
                  Portal do Cliente
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Link de acesso e credenciais de acompanhamento para <strong>{client.name}</strong>.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo rolável */}
        <div className="overflow-y-auto p-6 sm:p-7 space-y-6">
          {/* Link Central do Escritório */}
          {portalUrl && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-blue-600" /> Portal do Escritório
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-200/60 px-2 py-0.5 rounded-md">
                    Página Geral
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Link único do escritório. O cliente entra com seu código e visualiza todos os seus projetos vinculados.
                </p>
              </div>

              <div className="space-y-2">
                <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs text-slate-600 truncate select-all">
                  {portalUrl}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copiar Link
                      </>
                    )}
                  </button>

                  <a
                    href={portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    title="Abrir em nova aba"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Credenciais e Envio por E-mail */}
          <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/90 space-y-4">
            {/* Dados do Cliente */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0 shadow-xs">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h5 className="text-sm font-bold text-slate-900 truncate">
                    {client.name}
                  </h5>
                  {client.person_type && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200/60 text-slate-600">
                      {client.person_type}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-mono truncate">
                  {client.email || 'Sem e-mail cadastrado'} {client.phone ? `• ${client.phone}` : ''}
                </p>
              </div>
            </div>

            {/* Ações de Senha por E-mail */}
            <div className="pt-3 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">
                A senha é enviada confidencialmente para o e-mail do cliente.
              </span>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Botão 1: Enviar código atual */}
                <button
                  type="button"
                  onClick={handleResendAccess}
                  disabled={loadingType !== null}
                  className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  title="Reenvia o código de acesso atual para o e-mail cadastrado"
                >
                  {loadingType === 'resend' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Mail className="w-3.5 h-3.5" />
                  )}
                  <span>Enviar Código de Acesso</span>
                </button>

                {/* Botão 2: Gerar novo código e enviar */}
                <button
                  type="button"
                  onClick={handleRegenerateCode}
                  disabled={loadingType !== null}
                  className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-white hover:bg-amber-50 text-amber-700 hover:text-amber-800 border border-amber-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  title="Gera um código totalmente novo e envia por e-mail, invalidando o anterior"
                >
                  {loadingType === 'regenerate' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span>Gerar Novo Código de Acesso</span>
                </button>
              </div>
            </div>

            {/* Mensagens de Feedback */}
            {feedbackMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{feedbackMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer do Modal */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
