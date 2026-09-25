'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  FolderGit2,
  Plus,
  ArrowRight,
  Compass,
  Calendar,
  User,
  Search,
  SlidersHorizontal,
  Edit2,
  Trash2,
  LayoutGrid,
  List,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
} from 'lucide-react'
import { deleteProjectAction } from '@/lib/actions/projects'
import { ClientData } from '@/lib/actions/clients'
import EditProjectModal from '@/components/projects/EditProjectModal'
import { useAlert } from '@/components/ui/ConfirmDialog'
import {
  formatProjectClientDisplay,
  formatNumberBRL,
} from '@/lib/formatters-and-validators'
import { usePermissions } from '@/contexts/PermissionsContext'
import { ProfilePermissions } from '@/types/profiles'


export interface ProjectItem {
  id: string
  organization_id: string
  code: string
  title: string
  description: string | null
  client_id?: string | null
  client_name: string
  client_email: string | null
  client_phone: string | null
  client_ids?: string[]
  typology: string | null
  area_sqm: number | null
  estimated_budget: number | null
  address: string | null
  city: string | null
  state: string | null
  start_date: string | null
  deadline: string | null
  status: string
  created_at: string
}

export interface ProjectsManagerClientProps {
  initialProjects: ProjectItem[]
  initialClients?: ClientData[]
  organizationId?: string
  isOwner?: boolean
  userPermissions?: ProfilePermissions
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  ativo: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Ativo' },
  em_producao: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Em Andamento' },
  pausado: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Pausado' },
  concluido: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', label: 'Concluído' },
  cancelado: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'Cancelado' },
}

export default function ProjectsManagerClient({
  initialProjects,
  initialClients = [],
  organizationId,
  isOwner: propIsOwner,
  userPermissions: propPermissions,
}: ProjectsManagerClientProps) {
  const showAlert = useAlert()
  const { can, isOwner: contextIsOwner } = usePermissions()
  const effectiveIsOwner = propIsOwner !== undefined ? propIsOwner : contextIsOwner
  const canCreate = effectiveIsOwner || can('projects_create')
  const canEdit = effectiveIsOwner || can('projects_edit')
  const canDelete = effectiveIsOwner || can('projects_delete')

  const [projects, setProjects] = useState<ProjectItem[]>(initialProjects)
  const [availableClients, setAvailableClients] = useState<ClientData[]>(initialClients)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  useEffect(() => {
    setAvailableClients((prev) => {
      const map = new Map<string, ClientData>()
      initialClients.forEach((c) => map.set(c.id, c))
      prev.forEach((c) => map.set(c.id, c))
      return Array.from(map.values())
    })
  }, [initialClients])

  // Edit Modal State
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null)

  // Delete Modal State
  const [deletingProject, setDeletingProject] = useState<ProjectItem | null>(null)

  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  // Trava scroll de fundo quando modal de exclusão estiver aberto
  useEffect(() => {
    if (deletingProject) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [deletingProject])

  // Filtered Projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchSearch =
        search.trim() === '' ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase()) ||
        p.client_name.toLowerCase().includes(search.toLowerCase()) ||
        (p.typology && p.typology.toLowerCase().includes(search.toLowerCase())) ||
        (p.city && p.city.toLowerCase().includes(search.toLowerCase()))

      const matchStatus = statusFilter === 'todos' || p.status === statusFilter

      return matchSearch && matchStatus
    })
  }, [projects, search, statusFilter])

  // Open Edit Modal
  const handleOpenEdit = (p: ProjectItem) => {
    setEditingProject(p)
  }

  // Submit Delete
  const handleConfirmDelete = async () => {
    if (!deletingProject) return

    setLoading(true)
    const res = await deleteProjectAction(deletingProject.id)
    setLoading(false)

    if (res?.error) {
      await showAlert({
        title: 'Erro ao excluir projeto',
        message: res.error || 'Não foi possível excluir o projeto.',
        variant: 'error',
      })
    } else {
      setProjects((prev) => prev.filter((p) => p.id !== deletingProject.id))
      setDeletingProject(null)
      showToast('Projeto excluído com sucesso.')
    }
  }

  const renderProjectCard = (proj: (typeof filteredProjects)[0]) => {
    const statusConfig = STATUS_COLORS[proj.status] || STATUS_COLORS.ativo

    return (
      <div
        key={proj.id}
        className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative"
      >
        <div className="space-y-3">
          {/* Top Bar: Code, Status & Quick Action Buttons */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono font-medium text-slate-400">
              {proj.code}
            </span>

            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
              >
                {statusConfig.label}
              </span>

              {/* Edit & Delete Action Buttons */}
              {canEdit && (
                <button
                  onClick={() => handleOpenEdit(proj)}
                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                  title="Editar Informações do Projeto"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}

              {canDelete && (
                <button
                  onClick={() => setDeletingProject(proj)}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Excluir Projeto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Project Title & Client */}
          <div>
            <Link
              href={`/app/projetos/${proj.id}`}
              className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors block line-clamp-1 cursor-pointer"
            >
              {proj.title}
            </Link>
            {(() => {
              const { label, names } = formatProjectClientDisplay(proj.client_name, proj.client_ids)
              return (
                <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {label}: <strong className="text-slate-700">{names}</strong>
                  </span>
                </p>
              )
            })()}
          </div>

          {/* Metadata Chips */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-sm text-slate-600">
            <div className="flex items-center gap-1.5 truncate">
              <Compass className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{proj.area_sqm ? `${formatNumberBRL(proj.area_sqm)} m²` : 'Área não definida'}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{proj.deadline ? proj.deadline : 'Sem prazo'}</span>
            </div>
          </div>
        </div>

        {/* Bottom Action: Open Project Hub */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            {proj.typology || 'Residencial'}
          </span>

          <Link
            href={`/app/projetos/${proj.id}`}
            className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white text-sm font-semibold transition-all cursor-pointer shadow-2xs"
          >
            Ver detalhes <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 antialiased">
      {/* Toast Notification */}
      {feedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Page Header & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FolderGit2 className="w-6 h-6 text-blue-600" /> Projetos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie o ciclo completo de projetos, prazos e controle de aprovações. ({projects.length} cadastrados)
          </p>
        </div>

        {canCreate && (
          <Link
            href="/app/projetos/novo"
            className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm shadow-blue-500/25 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> Novo Projeto
          </Link>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Box */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, nome do projeto, cliente, tipologia ou cidade..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 bg-slate-50/50 focus:bg-white transition-all text-slate-800 font-medium"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Dropdown & View Mode Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm font-semibold text-slate-700 bg-transparent outline-hidden cursor-pointer"
            >
              <option value="todos">Todos os Status</option>
              <option value="ativo">Ativos</option>
              <option value="pausado">Pausados</option>
              <option value="concluido">Concluídos</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </div>

          <div className="hidden xl:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              title="Visualização em Cards"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              title="Visualização em Lista / Tabela"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center space-y-4 shadow-xs">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">
              {search || statusFilter !== 'todos' ? 'Nenhum projeto encontrado' : 'Nenhum projeto cadastrado'}
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              {search || statusFilter !== 'todos'
                ? 'Tente limpar a busca ou os filtros para ver todos os projetos.'
                : 'Cadastre seu primeiro projeto e as etapas do fluxo de trabalho serão configuradas automaticamente!'}
            </p>
          </div>
          {search || statusFilter !== 'todos' ? (
            <button
              onClick={() => {
                setSearch('')
                setStatusFilter('todos')
              }}
              className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-all cursor-pointer"
            >
              Limpar Filtros
            </button>
          ) : canCreate ? (
            <Link
              href="/app/projetos/novo"
              className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Cadastrar Projeto Agora
            </Link>
          ) : null}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map(renderProjectCard)}
        </div>
      ) : (
        <>
          {/* TABLE VIEW */}
          <div className="hidden xl:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-xs">
                <tr>
                  <th className="py-3.5 px-4">Código</th>
                  <th className="py-3.5 px-4">Projeto</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Tipologia</th>
                  <th className="py-3.5 px-4">Área</th>
                  <th className="py-3.5 px-4">Prazo</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((proj) => {
                  const statusConfig = STATUS_COLORS[proj.status] || STATUS_COLORS.ativo

                  return (
                    <tr key={proj.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-4 px-4 font-mono text-xs font-medium text-slate-500">
                        {proj.code}
                      </td>
                      <td className="py-4 px-4">
                        <Link
                          href={`/app/projetos/${proj.id}`}
                          className="font-bold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          {proj.title}
                        </Link>
                        {proj.address && (
                          <p className="text-xs text-slate-500 truncate max-w-xs">{proj.address}</p>
                        )}
                      </td>
                      <td className="py-4 px-4 text-slate-700 font-medium">
                        {formatProjectClientDisplay(proj.client_name, proj.client_ids).names}
                      </td>
                      <td className="py-4 px-4 text-slate-500">
                        {proj.typology || 'Residencial'}
                      </td>
                      <td className="py-4 px-4 text-slate-600 font-mono">
                        {proj.area_sqm ? `${formatNumberBRL(proj.area_sqm)} m²` : '—'}

                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        {proj.deadline || '—'}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right space-x-1.5 shrink-0">
                        <Link
                          href={`/app/projetos/${proj.id}`}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg inline-flex items-center transition-colors cursor-pointer"
                          title="Ver detalhes"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                        {canEdit && (
                          <button
                            onClick={() => handleOpenEdit(proj)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg inline-flex items-center transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeletingProject(proj)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg inline-flex items-center transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fallback to Cards on Mobile/Tablet (< 1280px) */}
        <div className="grid xl:hidden grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map(renderProjectCard)}
        </div>
      </>
    )}

      {/* MODAL: EDITAR PROJETO */}
      <EditProjectModal
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        project={editingProject}
        clients={availableClients}
        organizationId={organizationId || editingProject?.organization_id || ''}
        onSaved={(updatedProject) => {
          setProjects((prev) =>
            prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
          )
          showToast('Projeto atualizado com sucesso!')
        }}
      />

      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO */}
      {deletingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setDeletingProject(null)} />
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 space-y-4 border border-rose-100 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Excluir Projeto</h3>
                <p className="text-sm text-slate-500">Esta ação não pode ser desfeita.</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              Tem certeza que deseja excluir o projeto{' '}
              <strong className="text-slate-900 font-bold">{deletingProject.title}</strong> ({deletingProject.code})?
              Todas as etapas, comentários, anexos e fichas vinculadas serão excluídos permanentemente.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProject(null)}
                className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={loading}
                className="px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Excluindo...' : 'Sim, Excluir Projeto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
