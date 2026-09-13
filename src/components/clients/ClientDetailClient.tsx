'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Edit2,
  Plus,
  FolderGit2,
  Calendar,
  DollarSign,
  Compass,
  CheckCircle2,
  MessageCircle,
  KeyRound,
  Send,
  Loader2,
  ShieldCheck,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import BackButton from '@/components/ui/BackButton'
import {
  ClientData,
  ClientProjectItem,
  resendClientPortalAccessAction,
  regenerateClientAccessCodeAction,
} from '@/lib/actions/clients'
import { maskCPFOrCNPJ, maskPhone, maskCEP } from '@/lib/formatters-and-validators'
import { formatDateBR } from '@/lib/date-utils'
import { useConfirm, useAlert } from '@/components/ui/ConfirmDialog'
import { ProfilePermissions, hasPermission } from '@/types/profiles'
import { usePermissions } from '@/contexts/PermissionsContext'
import ClientModal from './ClientModal'

export interface ClientDetailClientProps {
  client: ClientData
  projects: ClientProjectItem[]
  organizationId?: string
  isOwner?: boolean
  userPermissions?: ProfilePermissions
}

export default function ClientDetailClient({
  client: initialClient,
  projects,
  organizationId,
  isOwner: propIsOwner,
  userPermissions: propUserPermissions,
}: ClientDetailClientProps) {
  const permissionsContext = usePermissions()
  const isOwner = propIsOwner ?? permissionsContext.isOwner
  const userPermissions = propUserPermissions ?? permissionsContext.permissions
  const canCreateEdit = hasPermission(isOwner, userPermissions, 'clients_create_edit')
  const canPortal = hasPermission(isOwner, userPermissions, 'clients_portal')
  const canCreateProject = hasPermission(isOwner, userPermissions, 'projects_create')

  const confirm = useConfirm()
  const showAlert = useAlert()
  const [client, setClient] = useState<ClientData>(initialClient)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [resendingAccess, setResendingAccess] = useState(false)
  const [regeneratingCode, setRegeneratingCode] = useState(false)
  const [accessCode, setAccessCode] = useState(client.access_code || '')
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  const portalToken = client.portal_token || ''
  const portalUrl = typeof window !== 'undefined' && portalToken
    ? `${window.location.origin}/portal/${portalToken}`
    : `/portal/${portalToken}`

  const handleCopyLink = () => {
    if (!portalToken) return
    navigator.clipboard.writeText(portalUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleCopyCode = () => {
    if (!accessCode) return
    navigator.clipboard.writeText(accessCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleRegenerateCode = async () => {
    const confirmed = await confirm({
      title: 'Gerar Novo Código de Acesso',
      message: 'Deseja gerar um novo código de acesso aleatório para este cliente?',
      description: 'O código anterior deixará de funcionar imediatamente para novos acessos ao portal.',
      confirmText: 'Gerar Novo Código',
      cancelText: 'Cancelar',
      variant: 'warning',
    })

    if (!confirmed) return

    setRegeneratingCode(true)
    const res = await regenerateClientAccessCodeAction(client.id)
    setRegeneratingCode(false)

    if (res.success && res.accessCode) {
      setAccessCode(res.accessCode)
      await showAlert({
        title: 'Código Atualizado',
        message: `Novo código gerado com sucesso: ${res.accessCode}`,
        variant: 'success',
      })
    } else {
      await showAlert({
        title: 'Erro ao gerar código',
        message: res.error || 'Não foi possível gerar novo código.',
        variant: 'error',
      })
    }
  }

  const handleResendAccess = async () => {
    if (!client.email) {
      await showAlert({
        title: 'E-mail Necessário',
        message: 'O cliente precisa ter um e-mail cadastrado para receber o link e o código de acesso.',
        variant: 'warning',
      })
      return
    }

    const confirmed = await confirm({
      title: 'Enviar Acesso ao Portal',
      message: `Deseja enviar o Magic Link e o Código de Acesso para o e-mail do cliente (${client.email})?`,
      description: 'O cliente receberá um e-mail com as instruções para acessar os projetos deste escritório com total segurança.',
      confirmText: 'Enviar Acesso por E-mail',
      cancelText: 'Cancelar',
      variant: 'primary',
    })

    if (!confirmed) return

    setResendingAccess(true)
    const res = await resendClientPortalAccessAction(client.id)
    setResendingAccess(false)

    if (res.success) {
      await showAlert({
        title: 'Acesso Enviado',
        message: res.message || 'Link e código enviados com sucesso para o e-mail do cliente.',
        variant: 'success',
      })
    } else {
      await showAlert({
        title: 'Erro ao Enviar Acesso',
        message: res.error || 'Não foi possível enviar o acesso do cliente.',
        variant: 'error',
      })
    }
  }

  const rawPhoneDigits = client.phone ? client.phone.replace(/\D/g, '') : ''
  const whatsappUrl = rawPhoneDigits.length >= 10
    ? `https://wa.me/55${rawPhoneDigits}`
    : null

  const getInitials = (name: string) => {
    if (!name) return 'CL'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const formatCurrencyBRL = (val?: number | null) => {
    if (val == null) return null
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  return (
    <div className="space-y-6 antialiased max-w-7xl mx-auto">
      {/* 1. TOP HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BackButton fallbackHref="/app/clientes" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {client.name}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${client.status === 'ativo'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                {client.status === 'ativo' ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {client.person_type === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'} • {projects.length} projeto(s) vinculado(s)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canCreateEdit && (
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-slate-50 text-sm font-semibold transition-all shadow-xs cursor-pointer"
            >
              <Edit2 className="w-4 h-4" /> Editar Cadastro
            </button>
          )}

          {canCreateProject && (
            <Link
              href={`/app/projetos/novo?clientId=${client.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Novo Projeto para este Cliente
            </Link>
          )}
        </div>
      </div>

      {/* 2. CLIENT METADATA CARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Identificação e Documentos */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl font-extrabold text-base flex items-center justify-center shrink-0 ${client.person_type === 'PJ'
                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                : 'bg-blue-100 text-blue-700 border border-blue-200'
              }`}>
              {client.person_type === 'PJ' ? <Building className="w-6 h-6" /> : getInitials(client.name)}
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-extrabold text-slate-900 text-base block truncate">
                {client.name}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {client.document_number
                  ? `${client.person_type === 'PJ' ? 'CNPJ: ' : 'CPF: '}${maskCPFOrCNPJ(client.document_number, client.person_type)}`
                  : 'Documento não informado'}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100 text-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Tipo de Pessoa:</span>
              <strong className="text-slate-800">{client.person_type === 'PJ' ? 'Jurídica (PJ)' : 'Física (PF)'}</strong>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Status:</span>
              <strong className={client.status === 'ativo' ? 'text-emerald-700' : 'text-slate-600'}>
                {client.status === 'ativo' ? 'Ativo' : 'Inativo'}
              </strong>
            </div>
          </div>
        </div>

        {/* Canais de Contato */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Canais de Contato
          </span>

          <div className="space-y-2.5 text-sm">
            {client.phone ? (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-700 font-mono font-bold">
                  <Phone className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{maskPhone(client.phone)}</span>
                </div>
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 py-1 px-2.5 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 text-xs font-bold transition-all"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-700" /> WhatsApp
                  </a>
                )}
              </div>
            ) : (
              <p className="text-slate-400 italic text-sm">Telefone não cadastrado</p>
            )}

            {client.email ? (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-700 truncate">
                  <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="truncate">{client.email}</span>
                </div>
                <a
                  href={`mailto:${client.email}`}
                  className="text-blue-600 hover:underline text-xs font-bold shrink-0 ml-2"
                >
                  Enviar E-mail
                </a>
              </div>
            ) : (
              <p className="text-slate-400 italic text-sm">E-mail não cadastrado</p>
            )}
          </div>
        </div>

        {/* Endereço e Localização */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Endereço & Localização
          </span>

          <div className="space-y-1.5 text-sm text-slate-600">
            {client.address ? (
              <p className="font-semibold text-slate-800">{client.address}</p>
            ) : null}

            {client.city || client.state ? (
              <p className="flex items-center gap-1.5 text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  {client.city ? `${client.city}` : ''}
                  {client.city && client.state ? ' - ' : ''}
                  {client.state || ''}
                </span>
                {client.zip_code && (
                  <span className="font-mono text-slate-400">({maskCEP(client.zip_code)})</span>
                )}
              </p>
            ) : null}

            {!client.address && !client.city && !client.state && (
              <p className="text-slate-400 italic text-sm">Endereço não informado</p>
            )}

            {client.notes && (
              <div className="mt-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400 block uppercase">Notas Internas:</span>
                <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{client.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2.1 PORTAL DO CLIENTE (ACESSO EXCLUSIVO DESTE ESCRITÓRIO) */}
      {canPortal && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-7 rounded-3xl border border-slate-800 shadow-lg space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 shadow-inner">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Portal do Cliente</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Magic Link Ativo
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Acesso exclusivo aos projetos deste cliente com seu escritório, sem necessidade de login.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResendAccess}
              disabled={resendingAccess || !client.email}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 cursor-pointer shrink-0"
            >
              {resendingAccess ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Enviar Link e Código por E-mail
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Link do Portal */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Magic Link do Portal
              </span>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 truncate">
                  {portalUrl}
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Copiar link"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
                </button>
                {portalToken && (
                  <a
                    href={`/portal/${portalToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all shrink-0"
                    title="Abrir portal em nova guia"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                O cliente acessa todos os seus projetos vinculados a este escritório através deste link.
              </p>
            </div>

            {/* Código de Acesso */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Código de Acesso do Cliente
              </span>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 font-mono text-lg font-bold tracking-widest text-amber-400 text-center">
                  {accessCode || '------'}
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  disabled={!accessCode}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                  title="Copiar código"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copiado!' : 'Copiar'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleRegenerateCode}
                  disabled={regeneratingCode}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all shrink-0 cursor-pointer disabled:opacity-50"
                  title="Gerar novo código aleatório"
                >
                  <RefreshCw className={`w-4 h-4 ${regeneratingCode ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Código aleatório para proteger o portal geral contra acessos indevidos por terceiros.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. PROJETOS VINCULADOS */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Projetos Vinculados ({projects.length})
              </h3>
              <p className="text-sm text-slate-500">
                Todos os projetos vinculados a este cliente.
              </p>
            </div>
          </div>

          {canCreateProject && (
            <Link
              href={`/app/projetos/novo?clientId=${client.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-semibold transition-all cursor-pointer w-fit"
            >
              <Plus className="w-4 h-4" /> Adicionar Projeto
            </Link>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <FolderGit2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">Nenhum projeto vinculado a este cliente.</p>
            <p className="text-xs text-slate-400 mt-1">
              Crie o primeiro projeto para começar o cronograma e aprovações no portal.
            </p>
            {canCreateProject && (
              <Link
                href={`/app/projetos/novo?clientId=${client.id}`}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Criar Primeiro Projeto
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj) => {
              const prog = proj.progress_percent || 0
              return (
                <Link
                  key={proj.id}
                  href={`/app/projetos/${proj.id}`}
                  className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:border-blue-300 hover:shadow-md transition-all group space-y-3 block"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                      {proj.code}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${proj.status === 'concluido'
                        ? 'bg-emerald-100 text-emerald-800'
                        : proj.status === 'pausado'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                      {proj.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-base">
                      {proj.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {proj.typology || 'Residencial'} {proj.area_sqm ? `• ${proj.area_sqm} m²` : ''}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Progresso</span>
                      <span className="font-mono font-bold text-blue-600">{prog}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${prog}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-500">
                    <span>Prazo: {formatDateBR(proj.deadline) || 'Sem prazo'}</span>
                    <span className="text-blue-600 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      Abrir <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <ClientModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        clientToEdit={client}
        organizationId={organizationId}
        onSuccess={(updated) => setClient(updated)}
      />
    </div>
  )
}
