'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FileText,
  ShieldCheck,
  Briefcase,
  CircleDollarSign,
  Pencil,
  Edit2,
  Globe,
} from 'lucide-react'
import BackButton from '@/components/ui/BackButton'
import EditProjectModal from '@/components/projects/EditProjectModal'
import ProjectClientPortalModal from '@/components/projects/ProjectClientPortalModal'
import { ProjectClientInfo } from '@/components/projects/ProjectClientPortalSection'
import { ClientData } from '@/lib/actions/clients'
import { ProjectItem } from '@/components/projects/ProjectsManagerClient'
import { formatProjectClientDisplay, formatNumberBRL } from '@/lib/formatters-and-validators'
import { usePermissions } from '@/contexts/PermissionsContext'
import { ProfilePermissions } from '@/types/profiles'

export interface ProjectDetailHeaderProps {
  project: ProjectItem
  clients?: ClientData[]
  organizationId: string
  projectId: string
  isOwner?: boolean
  userPermissions?: ProfilePermissions
  projectCode?: string
  orgSlug?: string
  portalToken?: string
  linkedClients?: ProjectClientInfo[]
}

export default function ProjectDetailHeader({
  project,
  clients = [],
  organizationId,
  projectId,
  isOwner: propIsOwner,
  userPermissions: propPermissions,
  projectCode,
  orgSlug,
  portalToken,
  linkedClients = [],
}: ProjectDetailHeaderProps) {
  const router = useRouter()
  const { can, isOwner: contextIsOwner } = usePermissions()
  const effectiveIsOwner = propIsOwner !== undefined ? propIsOwner : contextIsOwner
  const canEdit = effectiveIsOwner || can('projects_edit')
  const canFinancial = effectiveIsOwner || can('module_financial')
  const canCompanies = effectiveIsOwner || can('module_companies')

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPortalOpen, setIsPortalOpen] = useState(false)
  const [currentProject, setCurrentProject] = useState<ProjectItem>(project)

  const handleProjectSaved = (updated: ProjectItem) => {
    setCurrentProject(updated)
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BackButton fallbackHref="/app/projetos" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {currentProject.title}
              </h1>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsEditOpen(true)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                  title="Editar informações do projeto"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}

              <span className="px-2 py-0.5 text-xs font-mono font-medium bg-slate-100 text-slate-500 rounded-md">
                {currentProject.code}
              </span>
            </div>

            {(() => {
              const { label, names } = formatProjectClientDisplay(
                currentProject.client_name,
                currentProject.client_ids
              )
              return (
                <p className="text-sm text-slate-500 mt-1.5">
                  {label}: <strong className="text-slate-700">{names}</strong> •{' '}
                  {currentProject.typology || 'Residencial'} •{' '}
                  {currentProject.area_sqm
                    ? `${formatNumberBRL(currentProject.area_sqm)} m²`
                    : 'Área não definida'}
                </p>
              )
            })()}
          </div>
        </div>

        {/* Action Tabs & Edit Project Button */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-white border border-blue-200 text-blue-700 hover:text-blue-800 hover:bg-blue-50/60 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-blue-600" /> Editar Projeto
            </button>
          )}

          {canFinancial && (
            <Link
              href={`/app/projetos/${projectId}/financeiro`}
              className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-white border border-emerald-200 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50/50 text-xs font-bold transition-all shadow-xs"
            >
              <CircleDollarSign className="w-3.5 h-3.5 text-emerald-600" /> Financeiro
            </Link>
          )}

          {canCompanies && (
            <Link
              href={`/app/projetos/${projectId}/fornecedores`}
              className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50/50 text-xs font-bold transition-all shadow-xs"
            >
              <Briefcase className="w-3.5 h-3.5 text-indigo-600" /> Empresas e Serviços
            </Link>
          )}

          <Link
            href={`/app/projetos/${projectId}/briefing`}
            className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-slate-50 text-xs font-bold transition-all shadow-xs"
          >
            <FileText className="w-3.5 h-3.5" /> Ficha de Briefing
          </Link>

          <Link
            href={`/app/projetos/${projectId}/auditoria`}
            className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-slate-50 text-xs font-bold transition-all shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Auditoria de Aprovações
          </Link>

          <button
            type="button"
            onClick={() => setIsPortalOpen(true)}
            className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-slate-50 text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Portal do Cliente e Links de Acesso"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" /> Portal do Cliente
          </button>
        </div>
      </div>

      <EditProjectModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        project={currentProject}
        clients={clients}
        organizationId={organizationId}
        onSaved={handleProjectSaved}
      />

      <ProjectClientPortalModal
        isOpen={isPortalOpen}
        onClose={() => setIsPortalOpen(false)}
        projectId={projectId}
        projectCode={projectCode || currentProject.code}
        orgSlug={orgSlug}
        portalToken={portalToken}
        linkedClients={linkedClients}
      />
    </>
  )
}
