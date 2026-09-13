'use client'

import { useState } from 'react'
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Lock,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Info,
  FolderGit2,
  CircleDollarSign,
  Briefcase,
  SlidersHorizontal,
  Settings,
  LayoutDashboard,
} from 'lucide-react'
import {
  AccessProfile,
  PERMISSION_CATEGORIES,
  PermissionKey,
  ProfilePermissions,
  FULL_PERMISSIONS,
} from '@/types/profiles'
import {
  createAccessProfileAction,
  updateAccessProfileAction,
  deleteAccessProfileAction,
} from '@/lib/actions/access-profiles'
import { useConfirm, useAlert } from '@/components/ui/ConfirmDialog'

interface ProfilesManagementClientProps {
  organizationId: string
  officeName: string
  initialProfiles: AccessProfile[]
  isOwner: boolean
  currentUserId: string
}

const PRESET_COLORS = [
  { label: 'Índigo', value: '#4F46E5' },
  { label: 'Azul Celeste', value: '#0284C7' },
  { label: 'Esmeralda', value: '#10B981' },
  { label: 'Âmbar', value: '#F59E0B' },
  { label: 'Rosa / Rubi', value: '#E11D48' },
  { label: 'Violeta', value: '#7C3AED' },
  { label: 'Grafite', value: '#475569' },
]

export default function ProfilesManagementClient({
  organizationId,
  officeName,
  initialProfiles,
  isOwner,
  currentUserId,
}: ProfilesManagementClientProps) {
  const confirm = useConfirm()
  const showAlert = useAlert()

  const [profiles, setProfiles] = useState<AccessProfile[]>(initialProfiles)
  const [selectedProfile, setSelectedProfile] = useState<AccessProfile | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  // Form State
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formColor, setFormColor] = useState('#2563EB')
  const [formPermissions, setFormPermissions] = useState<ProfilePermissions>({} as ProfilePermissions)

  // Abre modal para criar
  const handleOpenCreate = () => {
    setIsCreating(true)
    setSelectedProfile(null)
    setFormName('')
    setFormDescription('')
    setFormColor('#2563EB')
    // Começa com permissões básicas sugeridas (Visão geral + Projetos)
    setFormPermissions({
      module_dashboard: true,
      module_projects: true,
      projects_create: true,
      projects_edit: true,
      projects_delete: false,
      tasks_manage: true,
      module_clients: true,
      clients_create_edit: false,
      clients_delete: false,
      clients_portal: false,
      module_companies: true,
      companies_manage: false,
      module_financial: false,
      financial_view_sensitive: false,
      financial_create_edit: false,
      financial_delete: false,
      settings_stages: false,
      settings_office: false,
      settings_team: false,
      settings_profiles: false,
    })
    setModalError(null)
    setIsModalOpen(true)
  }

  // Abre modal para editar
  const handleOpenEdit = (profile: AccessProfile) => {
    setIsCreating(false)
    setSelectedProfile(profile)
    setFormName(profile.name)
    setFormDescription(profile.description || '')
    setFormColor(profile.color || '#2563EB')
    setFormPermissions(
      profile.is_owner_profile
        ? FULL_PERMISSIONS
        : { ...(profile.permissions || {}) }
    )
    setModalError(null)
    setIsModalOpen(true)
  }

  // Toggle de permissão individual
  const handleTogglePermission = (key: PermissionKey) => {
    if (selectedProfile?.is_owner_profile) return // Proprietário não pode ter permissões alteradas
    setFormPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  // Marcar/desmarcar todos de uma categoria
  const handleToggleCategory = (keys: PermissionKey[], enable: boolean) => {
    if (selectedProfile?.is_owner_profile) return
    setFormPermissions((prev) => {
      const next = { ...prev }
      for (const k of keys) {
        next[k] = enable
      }
      return next
    })
  }

  // Marcar todas do sistema
  const handleSetAllPermissions = (enable: boolean) => {
    if (selectedProfile?.is_owner_profile) return
    const next = {} as ProfilePermissions
    for (const cat of PERMISSION_CATEGORIES) {
      for (const p of cat.permissions) {
        next[p.key] = enable
      }
    }
    setFormPermissions(next)
  }

  // Submissão do Modal
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setModalError(null)

    if (isCreating) {
      const res = await createAccessProfileAction(organizationId, {
        name: formName,
        description: formDescription,
        color: formColor,
        permissions: formPermissions,
      })

      if (!res.success || !res.profile) {
        setModalError(res.error || 'Erro ao criar perfil.')
        setSaving(false)
        return
      }

      setProfiles((prev) => [...prev, res.profile!])
      setIsModalOpen(false)
      setSaving(false)
    } else if (selectedProfile) {
      const res = await updateAccessProfileAction(organizationId, selectedProfile.id, {
        name: formName,
        description: formDescription,
        color: formColor,
        permissions: selectedProfile.is_owner_profile ? FULL_PERMISSIONS : formPermissions,
      })

      if (!res.success) {
        setModalError(res.error || 'Erro ao atualizar perfil.')
        setSaving(false)
        return
      }

      setProfiles((prev) =>
        prev.map((p) =>
          p.id === selectedProfile.id
            ? {
                ...p,
                name: selectedProfile.is_owner_profile ? p.name : formName,
                description: formDescription,
                color: formColor,
                permissions: selectedProfile.is_owner_profile ? FULL_PERMISSIONS : formPermissions,
              }
            : p
        )
      )
      setIsModalOpen(false)
      setSaving(false)
    }
  }

  // Excluir Perfil
  const handleDeleteProfile = async (profile: AccessProfile) => {
    if (profile.is_owner_profile) {
      showAlert({
        title: 'Ação Não Permitida',
        message: 'O perfil de Proprietário é vitalício e não pode ser excluído.',
      })
      return
    }

    if (profile.members_count && profile.members_count > 0) {
      showAlert({
        title: 'Perfil em Uso',
        message: `Existem ${profile.members_count} membro(s) vinculados a este perfil. Altere o perfil desses membros antes de excluir.`,
      })
      return
    }

    const confirmed = await confirm({
      title: 'Excluir Perfil de Acesso',
      message: `Tem certeza que deseja excluir permanentemente o perfil "${profile.name}"? Esta ação não poderá ser desfeita.`,
      confirmText: 'Excluir Perfil',
      cancelText: 'Cancelar',
      variant: 'danger',
    })

    if (!confirmed) return

    const res = await deleteAccessProfileAction(organizationId, profile.id)
    if (!res.success) {
      showAlert({
        title: 'Erro ao excluir',
        message: res.error || 'Não foi possível excluir o perfil.',
      })
    } else {
      setProfiles((prev) => prev.filter((p) => p.id !== profile.id))
    }
  }

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'LayoutDashboard':
        return <LayoutDashboard className="w-4 h-4 text-blue-600" />
      case 'FolderGit2':
        return <FolderGit2 className="w-4 h-4 text-indigo-600" />
      case 'Users':
        return <Users className="w-4 h-4 text-emerald-600" />
      case 'Briefcase':
        return <Briefcase className="w-4 h-4 text-sky-600" />
      case 'CircleDollarSign':
        return <CircleDollarSign className="w-4 h-4 text-amber-600" />
      case 'Settings':
        return <Settings className="w-4 h-4 text-slate-600" />
      default:
        return <Shield className="w-4 h-4 text-slate-600" />
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Topo / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Configurações</span>
            <span>/</span>
            <span className="text-blue-600">Perfis de Acesso</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Perfis de Acesso & Permissões
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Personalize os cargos do seu escritório e defina exatamente quais funcionalidades cada perfil pode acessar.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shadow-xs shadow-blue-500/20 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Perfil</span>
        </button>
      </div>

      {/* Grid de Perfis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {profiles.map((profile) => {
          const isOwnerProfile = profile.is_owner_profile
          const permissionsCount = Object.values(profile.permissions || {}).filter(Boolean).length
          const totalPermissions = 20

          return (
            <div
              key={profile.id}
              className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md ${
                isOwnerProfile
                  ? 'border-indigo-200 ring-1 ring-indigo-500/10'
                  : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="p-6">
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold shadow-xs shrink-0"
                      style={{ backgroundColor: profile.color || '#2563EB' }}
                    >
                      {isOwnerProfile ? <Lock className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {profile.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isOwnerProfile && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60 text-[10px] font-bold uppercase tracking-wider">
                            Proprietário
                          </span>
                        )}
                        {profile.is_system && !isOwnerProfile && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                            Padrão
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações rápidas */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(profile)}
                      className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Editar Perfil e Permissões"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!isOwnerProfile && (
                      <button
                        onClick={() => handleDeleteProfile(profile)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title={
                          profile.members_count && profile.members_count > 0
                            ? 'Não é possível excluir perfil com membros'
                            : 'Excluir Perfil'
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Descrição */}
                <p className="text-xs text-slate-600 line-clamp-2 min-h-[32px] mb-6">
                  {profile.description || 'Nenhuma descrição informada para este perfil.'}
                </p>

                {/* Estatísticas e Permissões */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>Membros vinculados</span>
                    </span>
                    <strong className="text-slate-900 font-semibold">
                      {profile.members_count || 0}
                    </strong>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Acesso a ferramentas</span>
                      <span className="font-semibold text-slate-700">
                        {isOwnerProfile ? 'Acesso Total (100%)' : `${permissionsCount} de ${totalPermissions}`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: isOwnerProfile ? '100%' : `${Math.round((permissionsCount / totalPermissions) * 100)}%`,
                          backgroundColor: profile.color || '#2563EB',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Botão no rodapé do card */}
              <div className="p-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  {isOwnerProfile ? 'Blindado pelo sistema' : 'Editável pelo escritório'}
                </span>
                <button
                  onClick={() => handleOpenEdit(profile)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  Configurar Permissões &rarr;
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal de Criação / Edição de Perfil */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Topo do Modal */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold shadow-xs"
                  style={{ backgroundColor: formColor }}
                >
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {isCreating
                      ? 'Novo Perfil de Acesso'
                      : `Editar Perfil: ${selectedProfile?.name}`}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Defina o nome, identificação visual e a matriz de permissões
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário e Permissões */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {modalError && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Banner do Proprietário */}
                {selectedProfile?.is_owner_profile && (
                  <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-900 text-xs flex items-start gap-3">
                    <Lock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold mb-0.5">Perfil de Proprietário Protegido</strong>
                      <span>
                        Este é o perfil raiz do criador do escritório. Ele possui acesso irrestrito a 100% das
                        funcionalidades do sistema e não pode ter permissões desativadas ou revogadas.
                      </span>
                    </div>
                  </div>
                )}

                {/* Dados Básicos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nome do Perfil
                    </label>
                    <input
                      type="text"
                      required
                      disabled={selectedProfile?.is_owner_profile}
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Ex: Arquiteto Sênior, Financeiro, Coordenador"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Cor de Identificação (Badge)
                    </label>
                    <div className="flex items-center gap-2">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setFormColor(c.value)}
                          className={`h-8 w-8 rounded-lg flex items-center justify-center transition-transform cursor-pointer ${
                            formColor === c.value ? 'scale-110 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: c.value }}
                          title={c.label}
                        >
                          {formColor === c.value && <Check className="w-4 h-4 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Descrição do Perfil (Opcional)
                    </label>
                    <input
                      type="text"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Ex: Responsável pela elaboração de projetos executivos e relacionamento com clientes."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                    />
                  </div>
                </div>

                {/* Barra de Ações Rápidas de Permissão */}
                {!selectedProfile?.is_owner_profile && (
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Matriz de Permissões por Funcionalidade
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetAllPermissions(true)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                      >
                        Marcar Todas
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => handleSetAllPermissions(false)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                      >
                        Desmarcar Todas
                      </button>
                    </div>
                  </div>
                )}

                {/* Categorias e Toggles */}
                <div className="space-y-4">
                  {PERMISSION_CATEGORIES.map((category) => {
                    const catKeys = category.permissions.map((p) => p.key)
                    const allCatActive = catKeys.every((k) => formPermissions[k])

                    return (
                      <div
                        key={category.id}
                        className="border border-slate-200/90 rounded-2xl bg-white overflow-hidden"
                      >
                        {/* Header da Categoria */}
                        <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            {getCategoryIcon(category.iconName)}
                            <div>
                              <h4 className="text-xs font-bold text-slate-900">
                                {category.name}
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                {category.description}
                              </p>
                            </div>
                          </div>

                          {!selectedProfile?.is_owner_profile && (
                            <button
                              type="button"
                              onClick={() => handleToggleCategory(catKeys, !allCatActive)}
                              className="text-[11px] font-semibold text-slate-600 hover:text-blue-600 cursor-pointer"
                            >
                              {allCatActive ? 'Desmarcar módulo' : 'Marcar módulo'}
                            </button>
                          )}
                        </div>

                        {/* Itens de Permissão */}
                        <div className="p-3 divide-y divide-slate-100">
                          {category.permissions.map((perm) => {
                            const isChecked = Boolean(formPermissions[perm.key])
                            const isLocked = Boolean(selectedProfile?.is_owner_profile)

                            return (
                              <label
                                key={perm.key}
                                className={`flex items-start justify-between gap-4 p-2.5 rounded-xl transition-colors cursor-pointer ${
                                  isLocked ? 'cursor-default' : 'hover:bg-slate-50/80'
                                }`}
                              >
                                <div className="space-y-0.5 min-w-0 pr-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-900">
                                      {perm.label}
                                    </span>
                                    {perm.isModuleAccess && (
                                      <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-blue-50 text-blue-700 border border-blue-200/60">
                                        Mestre
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 leading-snug">
                                    {perm.description}
                                  </p>
                                </div>

                                {/* Switch Toggle */}
                                <div className="relative inline-flex items-center shrink-0 mt-0.5">
                                  <input
                                    type="checkbox"
                                    disabled={isLocked}
                                    checked={isChecked}
                                    onChange={() => handleTogglePermission(perm.key)}
                                    className="sr-only peer"
                                  />
                                  <div
                                    onClick={() => !isLocked && handleTogglePermission(perm.key)}
                                    className={`w-11 h-6 rounded-full transition-colors ${
                                      isChecked
                                        ? 'bg-blue-600 peer-checked:bg-blue-600'
                                        : 'bg-slate-200'
                                    } ${isLocked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                                  >
                                    <div
                                      className={`h-5 w-5 rounded-full bg-white shadow-xs transition-transform transform mt-0.5 ${
                                        isChecked ? 'translate-x-5.5' : 'translate-x-0.5'
                                      }`}
                                    />
                                  </div>
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Rodapé do Modal */}
              <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>{isCreating ? 'Criar Perfil' : 'Salvar Alterações'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
