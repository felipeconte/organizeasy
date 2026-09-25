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
  resendClientPortalAccessAction,
  regenerateAndSendClientAccessCodeAction,
} from '@/lib/actions/clients'
import { ProjectClientInfo } from '@/components/projects/ProjectClientPortalSection'
import { useConfirm } from '@/components/ui/ConfirmDialog'

export interface ProjectClientPortalModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  projectCode?: string
  orgSlug?: string
  portalToken?: string
  linkedClients?: ProjectClientInfo[]
}

export default function ProjectClientPortalModal({
  isOpen,
  onClose,
  projectId,
  projectCode,
  orgSlug,
  portalToken,
  linkedClients = [],
}: ProjectClientPortalModalProps) {
  const confirm = useConfirm()
  const [copiedProjectLink, setCopiedProjectLink] = useState(false)
  const [copiedOfficeLink, setCopiedOfficeLink] = useState(false)

  // Estados de ação por cliente
  const [actionState, setActionState] = useState<{
    [clientId: string]: {
      loadingType?: 'resend' | 'regenerate'
      message?: string
      error?: string
    }
  }>({})

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

  const officeUrl = orgSlug
    ? (typeof window !== 'undefined' ? `${window.location.origin}/portal/${orgSlug}` : `/portal/${orgSlug}`)
    : ''

  const projectIdentifier = portalToken || projectId
  const projectUrl = (orgSlug && projectIdentifier)
    ? (typeof window !== 'undefined' ? `${window.location.origin}/portal/${orgSlug}/projeto/${projectIdentifier}` : `/portal/${orgSlug}/projeto/${projectIdentifier}`)
    : (portalToken
      ? (typeof window !== 'undefined' ? `${window.location.origin}/portal/${portalToken}` : `/portal/${portalToken}`)
      : '')

  const handleCopyProjectLink = () => {
    if (!projectUrl) return
    navigator.clipboard.writeText(projectUrl)
    setCopiedProjectLink(true)
    setTimeout(() => setCopiedProjectLink(false), 2500)
  }

  const handleCopyOfficeLink = () => {
    if (!officeUrl) return
    navigator.clipboard.writeText(officeUrl)
    setCopiedOfficeLink(true)
    setTimeout(() => setCopiedOfficeLink(false), 2500)
  }

  const handleResendCurrentCode = async (client: ProjectClientInfo) => {
    if (!client.email) {
      setActionState((prev) => ({
        ...prev,
        [client.id]: {
          error: 'Este cliente não possui um e-mail cadastrado. Atualize o cadastro antes de reenviar.',
        },
      }))
      return
    }

    setActionState((prev) => ({
      ...prev,
      [client.id]: { loadingType: 'resend', error: undefined, message: undefined },
    }))

    const res = await resendClientPortalAccessAction(client.id)

    if (res.success) {
      setActionState((prev) => ({
        ...prev,
        [client.id]: {
          loadingType: undefined,
          message: res.message || 'Código atual reenviado com sucesso para o e-mail do cliente.',
        },
      }))
    } else {
      setActionState((prev) => ({
        ...prev,
        [client.id]: {
          loadingType: undefined,
          error: res.error || 'Falha ao reenviar código de acesso.',
        },
      }))
    }
  }

  const handleRegenerateAndSendCode = async (client: ProjectClientInfo) => {
    if (!client.email) {
      setActionState((prev) => ({
        ...prev,
        [client.id]: {
          error: 'Este cliente não possui um e-mail cadastrado. Atualize o cadastro antes de gerar o código.',
        },
      }))
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

    setActionState((prev) => ({
      ...prev,
      [client.id]: { loadingType: 'regenerate', error: undefined, message: undefined },
    }))

    const res = await regenerateAndSendClientAccessCodeAction(client.id)

    if (res.success) {
      setActionState((prev) => ({
        ...prev,
        [client.id]: {
          loadingType: undefined,
          message: res.message || 'Novo código gerado e enviado com sucesso para o cliente.',
        },
      }))
    } else {
      setActionState((prev) => ({
        ...prev,
        [client.id]: {
          loadingType: undefined,
          error: res.error || 'Falha ao gerar novo código.',
        },
      }))
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[calc(100dvh-2rem)] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header do Modal */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/60 shadow-xs">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-900">
                  Portal do Cliente & Aprovações
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Links de acesso e credenciais dos clientes envolvidos neste projeto.
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
          {/* Grid de Links do Portal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card A: Link Direto deste Projeto (fundo claro, sem fundo escuro) */}
            <div className="p-5 rounded-2xl bg-blue-50/40 border border-blue-200/80 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Link Direto do Projeto
                  </span>
                  {projectCode && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white text-blue-800 border border-blue-200">
                      {projectCode}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Direciona o cliente direto para a linha do tempo e aprovações deste projeto após autenticar.
                </p>
              </div>

              <div className="space-y-2">
                <div className="bg-white px-3 py-2 rounded-xl border border-blue-200/70 font-mono text-xs text-slate-700 truncate select-all">
                  {projectUrl || 'Gerando link...'}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyProjectLink}
                    disabled={!projectUrl}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {copiedProjectLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copiar Link
                      </>
                    )}
                  </button>

                  {projectUrl && (
                    <a
                      href={projectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      title="Abrir em nova aba"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Card B: Link Central do Escritório */}
            {officeUrl && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-blue-600" /> Portal do Escritório
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-200/60 px-2 py-0.5 rounded-md">
                      Página Geral
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Link único do escritório. O cliente entra com seu código e visualiza todos os seus projetos.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs text-slate-600 truncate select-all">
                    {officeUrl}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyOfficeLink}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      {copiedOfficeLink ? (
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
                      href={officeUrl}
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
          </div>

          {/* Clientes Vinculados & Gestão de Códigos de Acesso */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Clientes Vinculados ({linkedClients.length})
                </h4>
                <p className="text-xs text-slate-500">
                  Gerencie e envie as credenciais de acesso diretamente para os clientes vinculados.
                </p>
              </div>
            </div>

            {linkedClients.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <User className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Nenhum cliente vinculado a este projeto</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Edite as informações do projeto para vincular clientes e liberar os links de acompanhamento.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {linkedClients.map((client) => {
                  const state = actionState[client.id] || {}

                  return (
                    <div
                      key={client.id}
                      className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/90 space-y-4 hover:border-slate-300 transition-all"
                    >
                      {/* Dados do Cliente (sem código fixo/sigilo na UI) */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                      </div>

                      {/* Ações de Senha por E-mail */}
                      <div className="pt-3 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <span className="text-[11px] text-slate-400">
                          A senha é enviada confidencialmente para o e-mail do cliente.
                        </span>

                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          {/* Botão 1: Reenviar código atual */}
                          <button
                            type="button"
                            onClick={() => handleResendCurrentCode(client)}
                            disabled={state.loadingType !== undefined}
                            className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                            title="Reenvia o código de acesso atual deste cliente para o e-mail cadastrado"
                          >
                            {state.loadingType === 'resend' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Mail className="w-3.5 h-3.5" />
                            )}
                            <span>Enviar Código de Acesso</span>
                          </button>

                          {/* Botão 2: Gerar novo código e enviar */}
                          <button
                            type="button"
                            onClick={() => handleRegenerateAndSendCode(client)}
                            disabled={state.loadingType !== undefined}
                            className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-white hover:bg-amber-50 text-amber-700 hover:text-amber-800 border border-amber-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                            title="Gera um código totalmente novo e envia por e-mail, invalidando o anterior"
                          >
                            {state.loadingType === 'regenerate' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            <span>Gerar Novo Código de Acesso</span>
                          </button>
                        </div>
                      </div>

                      {/* Feedback Messages */}
                      {state.message && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{state.message}</span>
                        </div>
                      )}

                      {state.error && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>{state.error}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
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
