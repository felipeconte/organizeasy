'use client'

import { useState, useRef } from 'react'
import {
  Building2,
  Users,
  FileCheck,
  Edit2,
  Save,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  Shield,
  UserCheck,
  Mail,
  Phone,
  Hash,
  Globe,
  AlertCircle,
  X,
  UploadCloud,
  ImageIcon,
  Crop,
  AlertTriangle,
  KeyRound,
  Clock,
  Copy,
  Send,
  RefreshCw,
  Camera,
  ExternalLink,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  updateOrganizationAction,
  updateOrganizationLogoAction,
  addOrganizationMemberAction,
  updateMemberRoleAction,
  updateMemberProfileAction,
  removeMemberAction,
  resendOfficeInviteAction,
  cancelOfficeInviteAction,
} from '@/lib/actions/organization'
import { transferOfficeOwnershipAction } from '@/lib/actions/access-profiles'
import { AccessProfile, ProfilePermissions, hasPermission } from '@/types/profiles'
import { usePermissions } from '@/contexts/PermissionsContext'
import {
  cleanDigits,
  maskCPFOrCNPJ,
  maskPhone,
  validateCPF,
  validateCNPJ,
  slugify,
} from '@/lib/formatters-and-validators'
import ImageCropperModal from './ImageCropperModal'

export interface OrganizationData {
  id: string
  name: string
  slug: string
  professional_council_id?: string | null
  cau_caubr?: string | null
  cnpj: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
  owner_id: string
}

export interface MemberData {
  id: string
  organization_id: string
  user_id: string
  role: string
  profile_id?: string | null
  profile_name?: string
  profile_color?: string
  created_at: string
  email?: string
  fullName?: string
}

export interface PendingInviteData {
  id: string
  organization_id: string
  email: string
  profile_id?: string | null
  profile_name?: string
  profile_color?: string
  invite_code: string
  created_at: string
  status: string
}

export interface OfficeSettingsClientProps {
  organization: OrganizationData
  members: MemberData[]
  pendingInvites?: PendingInviteData[]
  profiles?: AccessProfile[]
  currentUserId: string
  currentUserEmail: string
  isOwner?: boolean
  userPermissions?: ProfilePermissions
}

const ROLE_LABELS: Record<string, { label: string; bg: string; text: string; border: string }> = {
  owner: { label: 'Proprietário', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  admin: { label: 'Administrador', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  collaborator: { label: 'Colaborador', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  intern: { label: 'Estagiário', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
}

import { useConfirm, useAlert } from '@/components/ui/ConfirmDialog'

export default function OfficeSettingsClient({
  organization: initialOrg,
  members: initialMembers,
  pendingInvites: initialPendingInvites = [],
  profiles: initialProfiles,
  currentUserId,
  currentUserEmail,
  isOwner,
  userPermissions,
}: OfficeSettingsClientProps) {
  const permContext = usePermissions()
  const effectiveIsOwner = isOwner ?? permContext.isOwner
  const effectivePermissions = userPermissions ?? permContext.permissions

  const canEditOffice = hasPermission(effectiveIsOwner, effectivePermissions, 'settings_office')
  const canManageTeam = hasPermission(effectiveIsOwner, effectivePermissions, 'settings_team')

  const router = useRouter()
  const confirm = useConfirm()
  const showAlert = useAlert()
  const [org, setOrg] = useState<OrganizationData>(initialOrg)
  const [members, setMembers] = useState<MemberData[]>(initialMembers)
  const [pendingInvites, setPendingInvites] = useState<PendingInviteData[]>(initialPendingInvites)
  const [profilesList, setProfilesList] = useState<AccessProfile[]>(initialProfiles || [])

  // Form State
  const [formData, setFormData] = useState({
    name: initialOrg.name || '',
    slug: initialOrg.slug || '',
    professional_council_id: initialOrg.professional_council_id || initialOrg.cau_caubr || '',
    cnpj: initialOrg.cnpj ? maskCPFOrCNPJ(initialOrg.cnpj) : '',
    phone: initialOrg.phone || '',
    email: initialOrg.email || currentUserEmail || '',
    logo_url: initialOrg.logo_url || '',
  })

  // Status de validação do documento em tempo real
  const docDigits = cleanDigits(formData.cnpj)
  const getDocStatus = () => {
    if (!docDigits) return null
    if (docDigits.length < 11) {
      return { type: 'incomplete', label: 'CPF', message: `CPF (${docDigits.length}/11)` }
    }
    if (docDigits.length === 11) {
      return validateCPF(docDigits)
        ? { type: 'valid', label: 'CPF', message: 'CPF Válido' }
        : { type: 'invalid', label: 'CPF', message: 'CPF Inválido' }
    }
    if (docDigits.length < 14) {
      return { type: 'incomplete', label: 'CNPJ', message: `CNPJ (${docDigits.length}/14)` }
    }
    if (docDigits.length === 14) {
      return validateCNPJ(docDigits)
        ? { type: 'valid', label: 'CNPJ', message: 'CNPJ Válido' }
        : { type: 'invalid', label: 'CNPJ', message: 'CNPJ Inválido' }
    }
    return { type: 'invalid', label: 'Documento', message: 'Excesso de dígitos' }
  }
  const docStatus = getDocStatus()

  // Modals & Feedback
  const [isEditing, setIsEditing] = useState(false)
  const [savingOrg, setSavingOrg] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Image Cropper State
  const [cropperRawImage, setCropperRawImage] = useState<string | null>(null)
  const [logoMenuOpen, setLogoMenuOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Add Member Modal State
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'collaborator' | 'intern'>('collaborator')
  const [newMemberProfileId, setNewMemberProfileId] = useState<string>('')
  const [savingMember, setSavingMember] = useState(false)
  const [memberModalError, setMemberModalError] = useState<string | null>(null)

  // Transfer Ownership State
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [targetMemberId, setTargetMemberId] = useState<string>('')
  const [transferAfterAction, setTransferAfterAction] = useState<'change_profile' | 'leave_office'>('change_profile')
  const [transferNewProfileId, setTransferNewProfileId] = useState<string>('')
  const [transferring, setTransferring] = useState(false)
  const [transferConfirmed, setTransferConfirmed] = useState(false)
  const [transferError, setTransferError] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  const [copiedPortalLink, setCopiedPortalLink] = useState(false)

  const handleCopyOfficePortalLink = () => {
    const portalUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/portal/${org.slug}`
        : `/portal/${org.slug}`
    navigator.clipboard.writeText(portalUrl)
    setCopiedPortalLink(true)
    showToast('Link do Portal do Cliente copiado!')
    setTimeout(() => setCopiedPortalLink(false), 2500)
  }

  // Handle Image File Select
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      await showAlert({
        title: 'Formato inválido',
        message: 'Por favor, selecione um arquivo de imagem válido (PNG, JPG, SVG, WebP).',
        variant: 'warning',
      })
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setCropperRawImage(reader.result as string)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // SAVE ORGANIZATION
  const handleSaveOrganization = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.slug.trim()) return

    // Validação estrita de CPF ou CNPJ caso preenchido
    const cleanDoc = cleanDigits(formData.cnpj)
    if (cleanDoc) {
      if (cleanDoc.length === 11) {
        if (!validateCPF(cleanDoc)) {
          await showAlert({
            title: 'CPF Inválido',
            message: 'O CPF informado para o escritório é inválido. Por favor, confira os números digitados.',
            variant: 'error',
          })
          return
        }
      } else if (cleanDoc.length === 14) {
        if (!validateCNPJ(cleanDoc)) {
          await showAlert({
            title: 'CNPJ Inválido',
            message: 'O CNPJ informado para o escritório é inválido. Por favor, confira os números digitados.',
            variant: 'error',
          })
          return
        }
      } else {
        await showAlert({
          title: 'Documento Incompleto',
          message: 'Por favor, informe um CPF completo (11 dígitos) ou um CNPJ completo (14 dígitos).',
          variant: 'error',
        })
        return
      }
    }

    const cleanSlug = slugify(formData.slug) || slugify(formData.name) || 'escritorio'

    setSavingOrg(true)
    const data = new FormData()
    data.append('name', formData.name.trim())
    data.append('slug', cleanSlug)
    data.append('professional_council_id', formData.professional_council_id.trim())
    data.append('cau_caubr', formData.professional_council_id.trim())
    data.append('cnpj', formData.cnpj.trim())
    data.append('phone', formData.phone.trim())
    data.append('email', formData.email.trim())
    data.append('logo_url', formData.logo_url.trim())

    const res = await updateOrganizationAction(org.id, data)
    setSavingOrg(false)

    if (res.success) {
      setOrg({
        ...org,
        name: formData.name.trim(),
        slug: cleanSlug,
        professional_council_id: formData.professional_council_id.trim() || null,
        cau_caubr: formData.professional_council_id.trim() || null,
        cnpj: formData.cnpj.trim() ? maskCPFOrCNPJ(formData.cnpj) : null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        logo_url: formData.logo_url.trim() || null,
      })
      setIsEditing(false)
      showToast('Dados do escritório atualizados com sucesso!')
      router.refresh()
    } else {
      await showAlert({
        title: 'Erro ao atualizar dados',
        message: res.error || 'Erro ao atualizar dados do escritório.',
        variant: 'error',
      })
    }
  }

  // ADD MEMBER BY EMAIL / INVITE
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setMemberModalError(null)

    const cleanEmail = newMemberEmail.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setMemberModalError('Por favor, insira um e-mail válido.')
      return
    }

    setSavingMember(true)
    const res = await addOrganizationMemberAction(org.id, {
      email: cleanEmail,
      role: newMemberRole,
      profileId: newMemberProfileId || undefined,
    })
    setSavingMember(false)

    if (res.success) {
      const selectedProf = profilesList.find((p) => p.id === newMemberProfileId)
      if (res.invite) {
        setPendingInvites((prev) => [
          {
            id: res.invite!.id,
            organization_id: org.id,
            email: cleanEmail,
            profile_id: newMemberProfileId || null,
            profile_name: selectedProf?.name || 'Colaborador',
            profile_color: selectedProf?.color || '#2563EB',
            invite_code: res.invite!.invite_code,
            created_at: new Date().toISOString(),
            status: 'pending',
          },
          ...prev.filter((i) => i.email !== cleanEmail),
        ])
      }
      setShowAddMemberModal(false)
      setNewMemberEmail('')
      setNewMemberProfileId('')
      showToast(res.message || `Convite enviado para ${cleanEmail}!`)
    } else {
      setMemberModalError(res.error || 'Não foi possível gerar o convite.')
    }
  }

  // REENVIAR CONVITE POR E-MAIL
  const handleResendInvite = async (invite: PendingInviteData) => {
    const res = await resendOfficeInviteAction(org.id, invite.id)
    if (res.success) {
      showToast(res.message || `Convite reenviado para "${invite.email}"!`)
    } else {
      await showAlert({
        title: 'Erro ao reenviar',
        message: res.error || 'Não foi possível reenviar o convite.',
        variant: 'error',
      })
    }
  }

  // COPIAR LINK DE CONVITE
  const handleCopyInviteLink = async (inviteId: string) => {
    try {
      const url = `${window.location.origin}/convite/${inviteId}`
      await navigator.clipboard.writeText(url)
      showToast('Link do convite copiado para a área de transferência!')
    } catch {
      showToast('Não foi possível copiar o link.')
    }
  }

  // CANCELAR CONVITE PENDENTE
  const handleCancelInvite = async (invite: PendingInviteData) => {
    const confirmed = await confirm({
      title: 'Cancelar Convite',
      message: `Tem certeza que deseja cancelar o convite para "${invite.email}"? O link enviado não poderá mais ser utilizado.`,
      confirmText: 'Cancelar Convite',
      cancelText: 'Voltar',
      variant: 'danger',
    })

    if (confirmed) {
      const res = await cancelOfficeInviteAction(org.id, invite.id)
      if (res.success) {
        setPendingInvites((prev) => prev.filter((i) => i.id !== invite.id))
        showToast('Convite cancelado com sucesso.')
      } else {
        await showAlert({
          title: 'Erro ao cancelar',
          message: res.error || 'Falha ao cancelar o convite.',
          variant: 'error',
        })
      }
    }
  }

  // UPDATE MEMBER PROFILE
  const handleUpdateProfile = async (memberId: string, profileId: string) => {
    const res = await updateMemberProfileAction(org.id, memberId, profileId)
    if (res.success) {
      const p = profilesList.find((prof) => prof.id === profileId)
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId
            ? { ...m, profile_id: profileId, profile_name: p?.name, profile_color: p?.color }
            : m
        )
      )
      showToast('Perfil do membro atualizado com sucesso!')
    } else {
      await showAlert({
        title: 'Erro ao atualizar perfil',
        message: res.error || 'Erro ao atualizar perfil do membro.',
        variant: 'error',
      })
    }
  }

  // UPDATE MEMBER ROLE (Fallback)
  const handleUpdateRole = async (memberId: string, role: 'owner' | 'admin' | 'collaborator' | 'intern') => {
    const res = await updateMemberRoleAction(org.id, memberId, role)
    if (res.success) {
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role } : m))
      )
      showToast('Função do membro atualizada!')
    } else {
      await showAlert({
        title: 'Erro ao atualizar função',
        message: res.error || 'Erro ao atualizar função.',
        variant: 'error',
      })
    }
  }

  // TRANSFER OWNERSHIP (IRREVOGÁVEL)
  const handleTransferOwnership = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetMemberId) {
      setTransferError('Selecione o membro que assumirá como Proprietário.')
      return
    }
    if (!transferConfirmed) {
      setTransferError('Você precisa marcar a confirmação de ciência sobre a irrevogabilidade desta ação.')
      return
    }
    if (transferAfterAction === 'change_profile' && !transferNewProfileId) {
      setTransferError('Selecione seu novo perfil de acesso no escritório.')
      return
    }

    setTransferring(true)
    setTransferError(null)

    const res = await transferOfficeOwnershipAction(org.id, {
      targetUserId: targetMemberId,
      afterAction: transferAfterAction,
      newProfileId: transferNewProfileId || undefined,
    })

    if (!res.success) {
      setTransferError(res.error || 'Não foi possível transferir a propriedade.')
      setTransferring(false)
    } else {
      if (res.leftOffice) {
        if (res.nextOrgName) {
          showToast(`Propriedade transferida. Alternando para o escritório "${res.nextOrgName}"...`)
        } else {
          showToast('Propriedade transferida com sucesso.')
        }
        router.push(res.redirectUrl || '/onboarding')
        router.refresh()
      } else {
        setShowTransferModal(false)
        setTransferring(false)
        showToast('Propriedade do escritório transferida com sucesso!')
        router.refresh()
      }
    }
  }

  // REMOVE MEMBER
  const handleRemoveMember = async (memberId: string, userId: string, memberEmail?: string) => {
    if (userId === org.owner_id) {
      await showAlert({
        title: 'Ação não permitida',
        message: 'Não é possível remover o proprietário principal do escritório.',
        variant: 'warning',
      })
      return
    }

    const displayName = memberEmail || 'este membro'
    const confirmed = await confirm({
      title: 'Remover Membro',
      message: `Tem certeza que deseja remover ${displayName} da equipe do escritório?`,
      confirmText: 'Remover Membro',
      cancelText: 'Cancelar',
      variant: 'danger',
    })

    if (confirmed) {
      const res = await removeMemberAction(org.id, memberId)
      if (res.success) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId))
        showToast('Membro removido do escritório.')
      } else {
        await showAlert({
          title: 'Erro ao remover membro',
          message: res.error || 'Erro ao remover membro.',
          variant: 'error',
        })
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 antialiased">
      {/* Toast Notification */}
      {feedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Image Cropper Modal */}
      {cropperRawImage && (
        <ImageCropperModal
          imageSrc={cropperRawImage}
          cropShape="rect"
          title="Ajustar Logomarca do Escritório"
          description="Arraste e use o zoom para centralizar o ícone perfeitamente."
          confirmText="Aplicar Logomarca"
          onCropComplete={async (croppedUrl) => {
            setCropperRawImage(null)
            if (isEditing) {
              setFormData((prev) => ({ ...prev, logo_url: croppedUrl }))
              showToast('Logomarca selecionada! Clique em "Salvar Alterações" para confirmar.')
            } else {
              // Salva imediatamente no banco de dados quando alterado na visualização
              setOrg((prev) => ({ ...prev, logo_url: croppedUrl }))
              setFormData((prev) => ({ ...prev, logo_url: croppedUrl }))
              const res = await updateOrganizationLogoAction(org.id, croppedUrl)
              if (res.success) {
                showToast('Logomarca do escritório atualizada com sucesso!')
              } else {
                await showAlert({
                  title: 'Erro ao salvar logomarca',
                  message: res.error || 'Não foi possível atualizar a logomarca do escritório.',
                  variant: 'error',
                })
              }
            }
          }}
          onCancel={() => setCropperRawImage(null)}
        />
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-blue-600" /> Perfil do Escritório
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie os dados cadastrais do escritório e controle os membros com acesso ao sistema.
          </p>
        </div>

        {canEditOffice && !isEditing && (
          <button
            onClick={() => {
              setFormData({
                name: org.name || '',
                slug: org.slug || '',
                professional_council_id: org.professional_council_id || org.cau_caubr || '',
                cnpj: org.cnpj ? maskCPFOrCNPJ(org.cnpj) : '',
                phone: org.phone || '',
                email: org.email || currentUserEmail || '',
                logo_url: org.logo_url || '',
              })
              setIsEditing(true)
            }}
            className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-slate-50 text-sm font-semibold transition-all shadow-xs cursor-pointer shrink-0"
          >
            <Edit2 className="w-4 h-4" /> Editar Informações
          </button>
        )}
      </div>

      {/* CARD: INFORMAÇÕES INSTITUCIONAIS */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-blue-600" /> Informações da Empresa
          </h2>
        </div>

        {isEditing ? (
          /* EDIT FORM */
          <form onSubmit={handleSaveOrganization} className="space-y-5">
            {/* Logo Attachment & Preview */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 shadow-xs flex items-center justify-center overflow-hidden shrink-0">
                  {formData.logo_url ? (
                    <img src={formData.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-8 h-8 text-slate-300" />
                  )}
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800 block">Logomarca do Escritório</span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    A imagem será exibida na barra lateral e no Portal do Cliente.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {formData.logo_url ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setCropperRawImage(formData.logo_url)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 text-slate-700 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                      title="Ajustar enquadramento da logomarca atual"
                    >
                      <Crop className="w-3.5 h-3.5 text-blue-600" />
                      Ajustar
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 text-slate-700 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                      title="Escolher novo arquivo de imagem"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                      Trocar
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, logo_url: '' })}
                      className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shadow-2xs cursor-pointer"
                      title="Remover Logo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 text-slate-700 text-sm font-semibold transition-all shadow-2xs cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4 text-blue-600" />
                    Anexar Imagem
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Nome do Escritório *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Studio & Consultoria Integrada"
                  className="w-full text-sm border border-slate-200 rounded-xl p-3 outline-hidden focus:border-blue-500 bg-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Identificador / Slug (URL) *
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Minúsculo, sem acentos, com hífen
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-mono">
                    /portal/
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: slugify(e.target.value) })}
                    placeholder="meu-escritorio"
                    className="w-full text-sm font-mono pl-16 border border-slate-200 rounded-xl p-3 outline-hidden focus:border-blue-500 bg-white"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Link do portal: <span className="font-mono text-blue-600 font-bold">/portal/{formData.slug || 'slug-do-escritorio'}</span>
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Registro Profissional (CAU, OAB, CRC, etc.)</label>
                <input
                  type="text"
                  value={formData.professional_council_id}
                  onChange={(e) => setFormData({ ...formData, professional_council_id: e.target.value })}
                  placeholder="Ex: A123456-7"
                  className="w-full text-sm border border-slate-200 rounded-xl p-3 outline-hidden focus:border-blue-500 bg-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    CPF ou CNPJ do Escritório
                  </label>
                  {docStatus && (
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md transition-all ${docStatus.type === 'valid'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : docStatus.type === 'invalid'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-500'
                        }`}
                    >
                      {docStatus.message}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cnpj: maskCPFOrCNPJ(e.target.value)
                    })
                  }
                  placeholder="000.000.000-00 ou 00.000.000/0001-90"
                  className={`w-full text-sm border rounded-xl p-3 outline-hidden transition-all bg-white ${docStatus?.type === 'invalid'
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10'
                    : docStatus?.type === 'valid'
                      ? 'border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
                      : 'border-slate-200 focus:border-blue-500'
                    }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">E-mail Institucional</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contato@escritorio.com"
                  className="w-full text-sm border border-slate-200 rounded-xl p-3 outline-hidden focus:border-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                  placeholder="(11) 98765-4321"
                  className="w-full text-sm border border-slate-200 rounded-xl p-3 outline-hidden focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    name: org.name || '',
                    slug: org.slug || '',
                    professional_council_id: org.professional_council_id || org.cau_caubr || '',
                    cnpj: org.cnpj ? maskCPFOrCNPJ(org.cnpj) : '',
                    phone: org.phone || '',
                    email: org.email || currentUserEmail || '',
                    logo_url: org.logo_url || '',
                  })
                  setIsEditing(false)
                }}
                className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingOrg || !formData.name.trim() || !formData.slug.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {savingOrg && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {savingOrg ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        ) : (
          /* DISPLAY VIEW */
          <div className="space-y-6">
            {/* Top Logo & Title Badge */}
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              <div className="relative group shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
                  {org.logo_url ? (
                    <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-8 h-8" />
                  )}
                </div>
                {canEditOffice && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (org.logo_url) {
                          setLogoMenuOpen(!logoMenuOpen)
                        } else {
                          fileInputRef.current?.click()
                        }
                      }}
                      className="absolute inset-0 bg-slate-900/50 rounded-2xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                      title={org.logo_url ? 'Opções da logomarca' : 'Adicionar logomarca'}
                    >
                      <Camera className="w-5 h-5" />
                    </button>

                    {/* Dropdown Menu de opções quando a logo já existe */}
                    {logoMenuOpen && org.logo_url && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setLogoMenuOpen(false)} />
                        <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-1.5 z-50 animate-in fade-in-0 zoom-in-95">
                          <button
                            type="button"
                            onClick={() => {
                              setLogoMenuOpen(false)
                              setCropperRawImage(org.logo_url)
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50/70 rounded-xl transition-colors text-left cursor-pointer"
                          >
                            <Crop className="w-4 h-4 text-blue-500" />
                            Ajustar Enquadramento
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLogoMenuOpen(false)
                              fileInputRef.current?.click()
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50/70 rounded-xl transition-colors text-left cursor-pointer"
                          >
                            <UploadCloud className="w-4 h-4 text-slate-500" />
                            Carregar Nova Logomarca
                          </button>
                          <div className="my-1 border-t border-slate-100" />
                          <button
                            type="button"
                            onClick={async () => {
                              setLogoMenuOpen(false)
                              const confirmed = await confirm({
                                title: 'Remover logomarca',
                                message: 'Tem certeza que deseja remover a logomarca do escritório?',
                                confirmText: 'Sim, remover',
                                cancelText: 'Cancelar',
                                variant: 'danger',
                              })
                              if (confirmed) {
                                setOrg((prev) => ({ ...prev, logo_url: null }))
                                setFormData((prev) => ({ ...prev, logo_url: '' }))
                                const res = await updateOrganizationLogoAction(org.id, '')
                                if (res.success) {
                                  showToast('Logomarca removida com sucesso.')
                                } else {
                                  showAlert({
                                    title: 'Erro',
                                    message: res.error || 'Não foi possível remover a logomarca.',
                                    variant: 'error',
                                  })
                                }
                              }
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 text-rose-500" />
                            Remover Logomarca
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{org.name}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold">
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    <span>Portal:</span>
                    <span className="font-mono font-bold">https://www.organizeasy.com.br/portal/{org.slug}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyOfficePortalLink}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                    title="Copiar link do Portal do Cliente"
                  >
                    {copiedPortalLink ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copiar Link</span>
                      </>
                    )}
                  </button>
                  <a
                    href={`/portal/${org.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-xs font-medium transition-colors cursor-pointer"
                    title="Abrir Portal do Cliente em nova aba"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir Portal</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Registro Profissional</span>
                <span className="text-sm text-slate-800 font-medium block">{org.professional_council_id || org.cau_caubr || 'Não informado'}</span>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  {(() => {
                    const digits = cleanDigits(org.cnpj)
                    if (digits.length === 11) return 'CPF do Escritório'
                    if (digits.length === 14) return 'CNPJ do Escritório'
                    return 'CPF / CNPJ'
                  })()}
                </span>
                <span className="text-sm text-slate-800 font-medium block">
                  {org.cnpj ? maskCPFOrCNPJ(org.cnpj) : 'Não informado'}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">E-mail de Contato</span>
                <span className="text-sm text-slate-800 font-medium block">{org.email || currentUserEmail}</span>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Telefone / WhatsApp</span>
                <span className="text-sm text-slate-800 font-medium block">{org.phone || 'Não informado'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CARD: MEMBROS e COLABORADORES */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" /> Membros e Colaboradores
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Controle quem tem acesso aos projetos e atribuição de tarefas do escritório.
            </p>
          </div>

          {canManageTeam && (
            <button
              onClick={() => {
                setMemberModalError(null)
                setNewMemberEmail('')
                setShowAddMemberModal(true)
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Adicionar Membro
            </button>
          )}
        </div>

        {members.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            Nenhum membro vinculado além do proprietário.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {members.map((m) => {
              const isCurrentUser = m.user_id === currentUserId
              const isOwner = m.user_id === org.owner_id
              const roleConfig = ROLE_LABELS[m.role] || ROLE_LABELS.collaborator
              const memberDisplayName = isCurrentUser
                ? `${currentUserEmail} (Você)`
                : m.fullName || m.email || 'Membro da Equipe'

              return (
                <div key={m.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                      {isCurrentUser ? 'EU' : <UserCheck className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {memberDisplayName}
                        </span>
                        {isOwner && (
                          <span className="px-2 py-0.5 rounded text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Proprietário
                          </span>
                        )}
                        {m.profile_name && !isOwner && (
                          <span
                            className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                            style={{ backgroundColor: m.profile_color || '#2563EB' }}
                          >
                            {m.profile_name}
                          </span>
                        )}
                      </div>
                      {!isCurrentUser && m.email && m.fullName && (
                        <span className="text-xs text-slate-500 block mt-0.5">
                          {m.email}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pl-12 sm:pl-0">
                    {isOwner ? (
                      <div className="flex items-center gap-2">
                        {isCurrentUser && members.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setTransferError(null)
                              setTransferConfirmed(false)
                              setTargetMemberId('')
                              setTransferAfterAction('change_profile')
                              const nonOwnerProf = profilesList.find((p) => !p.is_owner_profile)
                              setTransferNewProfileId(nonOwnerProf?.id || '')
                              setShowTransferModal(true)
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-all cursor-pointer shadow-2xs"
                            title="Transferir a propriedade do escritório para outro membro"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                            <span>Transferir Propriedade</span>
                          </button>
                        )}
                      </div>
                    ) : canManageTeam ? (
                      profilesList.length > 0 ? (
                        <select
                          value={m.profile_id || ''}
                          disabled={isOwner}
                          onChange={(e) => handleUpdateProfile(m.id, e.target.value)}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg border outline-hidden cursor-pointer bg-slate-50 text-slate-800 border-slate-200 hover:border-blue-400 transition-colors"
                        >
                          <option value="" disabled>Selecione um perfil...</option>
                          {profilesList
                            .filter((p) => !p.is_owner_profile)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <select
                          value={m.role}
                          disabled={isOwner}
                          onChange={(e) => handleUpdateRole(m.id, e.target.value as any)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border outline-hidden cursor-pointer ${roleConfig.bg} ${roleConfig.text} ${roleConfig.border} disabled:opacity-80`}
                        >
                          <option value="owner">Proprietário</option>
                          <option value="admin">Administrador</option>
                          <option value="collaborator">Colaborador</option>
                          <option value="intern">Estagiário</option>
                        </select>
                      )
                    ) : null}

                    {canManageTeam && !isOwner && (
                      <button
                        onClick={() => handleRemoveMember(m.id, m.user_id, m.email)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remover membro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* LISTAGEM DE CONVITES PENDENTES */}
        {pendingInvites.length > 0 && (
          <div className="pt-5 mt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Convites Pendentes ({pendingInvites.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Aguardando confirmação pelo link personalizado
              </span>
            </div>

            <div className="divide-y divide-slate-100/90 rounded-2xl bg-amber-50/20 border border-amber-200/60 p-1">
              {pendingInvites.map((inv) => (
                <div
                  key={inv.id}
                  className="py-3 px-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-amber-50/40 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">
                          {inv.email}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Pendente
                        </span>
                        {inv.profile_name && (
                          <span
                            className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                            style={{ backgroundColor: inv.profile_color || '#2563EB' }}
                          >
                            {inv.profile_name}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
                        Código: {inv.invite_code}
                      </span>
                    </div>
                  </div>

                  {/* Ações do convite pendente */}
                  {canManageTeam && (
                    <div className="flex items-center gap-2 shrink-0 pl-12 sm:pl-0">
                      <button
                        type="button"
                        onClick={() => handleCopyInviteLink(inv.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:text-blue-600 bg-white text-xs font-semibold text-slate-700 transition-all shadow-2xs cursor-pointer"
                        title="Copiar link de acesso para enviar pelo WhatsApp ou chat"
                      >
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copiar Link</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResendInvite(inv)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-amber-300 hover:text-amber-800 bg-white text-xs font-semibold text-slate-700 transition-all shadow-2xs cursor-pointer"
                        title="Reenviar e-mail de convite"
                      >
                        <Send className="w-3.5 h-3.5 text-amber-600" />
                        <span>Reenviar E-mail</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCancelInvite(inv)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Cancelar convite"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: ADICIONAR MEMBRO POR CONVITE */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setShowAddMemberModal(false)}
          />
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 space-y-4 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" /> Convidar Membro para a Equipe
              </h3>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Notification inside modal */}
            {memberModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{memberModalError}</span>
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-4 text-sm">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  E-mail do Convidado *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={newMemberEmail}
                    onChange={(e) => {
                      setNewMemberEmail(e.target.value)
                      if (memberModalError) setMemberModalError(null)
                    }}
                    placeholder="usuario@escritorio.com.br"
                    className="w-full text-sm border border-slate-200 rounded-xl p-3 pl-9 outline-hidden focus:border-blue-500 bg-white"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Um e-mail será enviado com um link exclusivo para o colaborador acessar o escritório. Não é obrigatório ter cadastro prévio no Organizeasy.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Perfil de Acesso
                </label>
                {profilesList.length > 0 ? (
                  <select
                    value={newMemberProfileId}
                    onChange={(e) => setNewMemberProfileId(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-xl p-3 outline-hidden focus:border-blue-500 bg-white cursor-pointer"
                  >
                    <option value="">Selecione o perfil...</option>
                    {profilesList
                      .filter((p) => !p.is_owner_profile)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                ) : (
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as any)}
                    className="w-full text-sm border border-slate-200 rounded-xl p-3 outline-hidden focus:border-blue-500 bg-white cursor-pointer"
                  >
                    <option value="collaborator">Colaborador (Pode gerenciar tarefas e projetos)</option>
                    <option value="admin">Administrador (Controle total das configurações)</option>
                    <option value="intern">Estagiário (Acesso operacional)</option>
                  </select>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMember || !newMemberEmail.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingMember && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {savingMember ? 'Enviando convite...' : 'Enviar Convite por E-mail'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TRANSFERIR PROPRIEDADE DO ESCRITÓRIO (IRREVOGÁVEL) */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => !transferring && setShowTransferModal(false)}
          />
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl z-10 space-y-5 border border-amber-200 animate-in zoom-in-95 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-amber-700">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Transferir Propriedade do Escritório
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                disabled={transferring}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Alerta de Irrevogabilidade */}
            <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-3 text-xs text-amber-900">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="block font-bold">AÇÃO IRREVOGÁVEL E DEFINITIVA</strong>
                <span>
                  Ao confirmar, você transferirá a titularidade e o controle total deste escritório ({org.name}) para o membro
                  escolhido. O novo proprietário passará a ter poder irrestrito sobre a equipe, configurações e projetos.
                </span>
              </div>
            </div>

            {transferError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{transferError}</span>
              </div>
            )}

            <form onSubmit={handleTransferOwnership} className="space-y-4 text-sm">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  1. Selecione o Novo Proprietário *
                </label>
                <select
                  required
                  value={targetMemberId}
                  onChange={(e) => setTargetMemberId(e.target.value)}
                  className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl p-3 outline-hidden focus:border-blue-500 bg-white cursor-pointer"
                >
                  <option value="">Selecione um membro da equipe...</option>
                  {members
                    .filter((m) => m.user_id !== currentUserId)
                    .map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.fullName || m.email || 'Membro'} ({m.email})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  2. O que você deseja fazer com a sua conta? *
                </label>
                <div className="space-y-2.5 pt-1">
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors bg-slate-50/50">
                    <input
                      type="radio"
                      name="afterAction"
                      value="change_profile"
                      checked={transferAfterAction === 'change_profile'}
                      onChange={() => setTransferAfterAction('change_profile')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <strong className="block font-semibold text-slate-800">
                        Permanecer no escritório com outro cargo
                      </strong>
                      <span className="text-slate-500 text-[11px]">
                        Você continuará membro da equipe, atuando sob o novo perfil selecionado.
                      </span>
                    </div>
                  </label>

                  {transferAfterAction === 'change_profile' && (
                    <div className="pl-6 pt-1">
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Seu novo perfil neste escritório:
                      </label>
                      <select
                        value={transferNewProfileId}
                        onChange={(e) => setTransferNewProfileId(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-hidden focus:border-blue-500 bg-white cursor-pointer"
                      >
                        {profilesList
                          .filter((p) => !p.is_owner_profile)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors bg-slate-50/50">
                    <input
                      type="radio"
                      name="afterAction"
                      value="leave_office"
                      checked={transferAfterAction === 'leave_office'}
                      onChange={() => setTransferAfterAction('leave_office')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <strong className="block font-semibold text-rose-700">
                        Sair completamente deste escritório
                      </strong>
                      <span className="text-slate-500 text-[11px]">
                        Sua conta será desvinculada deste escritório. Se você fizer parte de outro escritório, você será direcionado para ele; caso contrário, irá para o Onboarding.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Checkbox de confirmação consciente */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={transferConfirmed}
                    onChange={(e) => setTransferConfirmed(e.target.checked)}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-[11px] text-amber-900 font-medium leading-snug">
                    Estou ciente de que esta ação é <strong>IRREVOGÁVEL</strong> e transfere imediatamente a administração total do escritório para o membro selecionado.
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={transferring}
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={transferring || !targetMemberId || !transferConfirmed}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  {transferring && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {transferring ? 'Transferindo...' : 'Confirmar Transferência Irrevogável'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
