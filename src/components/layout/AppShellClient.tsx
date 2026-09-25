/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FolderGit2,
  Plus,
  SlidersHorizontal,
  Settings,
  LogOut,
  User,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  KanbanSquare,
  Briefcase,
  CircleDollarSign,
  Shield,
  ChevronsUpDown,
  Check,
  PlusCircle,
  Loader2,
  PieChart,
  Sparkles,
} from 'lucide-react'
import { logoutAction } from '@/lib/actions/auth'
import { switchActiveOrganizationAction } from '@/lib/actions/organization'
import type { UserOrganizationItem } from '@/types/organization'
import { BreadcrumbProvider } from '@/contexts/BreadcrumbContext'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { PermissionKey, ProfilePermissions } from '@/types/profiles'
import LiquidMorphFloatingMenu from '@/components/ui/liquid-morph-floating-menu'

interface AppShellClientProps {
  organizationId?: string
  officeName: string
  orgLogoUrl: string | null
  userDisplayName: string
  userAvatarUrl: string | null
  userRole: string
  isOwner?: boolean
  userPermissions?: Partial<ProfilePermissions>
  pendingClientUpdatesCount: number
  userOrganizations?: UserOrganizationItem[]
  activeOrgId?: string
  initialCollapsed?: boolean
  children: React.ReactNode
}

export function AppShellClient({
  organizationId,
  officeName,
  orgLogoUrl,
  userDisplayName,
  userAvatarUrl,
  userRole,
  isOwner = false,
  userPermissions,
  pendingClientUpdatesCount,
  userOrganizations = [],
  activeOrgId,
  initialCollapsed = false,
  children,
}: AppShellClientProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState<boolean>(initialCollapsed)
  const [isMounted, setIsMounted] = useState<boolean>(false)
  const [isOrgMenuOpen, setIsOrgMenuOpen] = useState<boolean>(false)
  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null)
  const [isFinancialMenuOpen, setIsFinancialMenuOpen] = useState<boolean>(() =>
    pathname.startsWith('/app/financeiro')
  )
  const [isCollapsedFinancialOpen, setIsCollapsedFinancialOpen] = useState<boolean>(false)
  const [collapsedFinancialPos, setCollapsedFinancialPos] = useState<{ top: number; left: number } | null>(null)
  const collapsedFinancialBtnRef = useRef<HTMLButtonElement | null>(null)

  // Sincroniza abertura do submenu Financeiro com a rota ativa sem cascateamento de render
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setIsFinancialMenuOpen(pathname.startsWith('/app/financeiro'))
    setIsCollapsedFinancialOpen(false)
  }

  // Sincroniza estado inicial com localStorage e cookie de forma segura para SSR
  useEffect(() => {
    requestAnimationFrame(() => {
      setIsMounted(true)
      try {
        const saved = localStorage.getItem('organizeasy_sidebar_collapsed') ?? localStorage.getItem('orgarq_sidebar_collapsed')
        if (saved !== null) {
          const savedBool = saved === 'true'
          if (savedBool !== isCollapsed) {
            setIsCollapsed(savedBool)
          }
          document.cookie = `organizeasy_sidebar_collapsed=${savedBool}; path=/; max-age=31536000; SameSite=Lax`
        } else {
          document.cookie = `organizeasy_sidebar_collapsed=${isCollapsed}; path=/; max-age=31536000; SameSite=Lax`
        }
      } catch {
        // Ignora erro de acesso ao localStorage se restrito
      }
    })
  }, [isCollapsed])

  const toggleSidebar = () => {
    setIsCollapsedFinancialOpen(false)
    setIsCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('organizeasy_sidebar_collapsed', String(next))
        document.cookie = `organizeasy_sidebar_collapsed=${next}; path=/; max-age=31536000; SameSite=Lax`
      } catch {
        // Ignora erro
      }
      return next
    })
  }

  const getInitials = (name: string) => {
    if (!name) return 'OE'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const mainNavItems = [
    {
      href: '/app',
      label: 'Visão Geral',
      icon: LayoutDashboard,
      exact: true,
      permissionKey: 'module_dashboard' as PermissionKey,
    },
    {
      href: '/app/clientes',
      label: 'Clientes',
      icon: Users,
      badge: pendingClientUpdatesCount,
      permissionKey: 'module_clients' as PermissionKey,
    },
    {
      href: '/app/projetos',
      label: 'Projetos',
      icon: FolderGit2,
      permissionKey: 'module_projects' as PermissionKey,
    },
    {
      href: '/app/empresas',
      label: 'Empresas e Serviços',
      icon: Briefcase,
      permissionKey: 'module_companies' as PermissionKey,
    },
    {
      href: '/app/financeiro',
      label: 'Financeiro',
      icon: CircleDollarSign,
      permissionKey: 'module_financial' as PermissionKey,
      subItems: [
        {
          href: '/app/financeiro',
          label: 'Visão Geral',
          icon: PieChart,
          exact: true,
        },
        {
          href: '/app/financeiro/lancamentos',
          label: 'Lançamentos',
          icon: CircleDollarSign,
        },
        {
          href: '/app/financeiro/lucratividade',
          label: 'Lucratividade por Projeto',
          icon: FolderGit2,
        },
        {
          href: '/app/financeiro/projecao',
          label: 'Passado, Presente e Futuro',
          icon: Sparkles,
        },
      ],
    },
  ]

  const configNavItems = [
    {
      href: '/app/configuracoes/etapas-fluxo',
      label: 'Etapas do Projeto',
      icon: KanbanSquare,
      permissionKey: 'settings_stages' as PermissionKey,
    },
    {
      href: '/app/configuracoes/etapas',
      label: 'Template de Tarefas',
      icon: SlidersHorizontal,
      permissionKey: 'settings_stages' as PermissionKey,
    },
    {
      href: '/app/configuracoes/escritorio',
      label: 'Dados do Escritório',
      icon: Settings,
      permissionKey: ['settings_office', 'settings_team'] as PermissionKey[],
    },
    {
      href: '/app/configuracoes/perfis',
      label: 'Perfis de Acesso',
      icon: Shield,
      permissionKey: 'settings_profiles' as PermissionKey,
    },
    {
      href: '/app/configuracoes/perfil',
      label: 'Meu Perfil',
      icon: User,
    },
  ]

  const checkPerm = (key?: PermissionKey | PermissionKey[]) => {
    if (isOwner) return true
    if (!key) return true
    if (Array.isArray(key)) {
      return key.some((k) => userPermissions?.[k] === true)
    }
    return userPermissions?.[key] === true
  }

  const visibleMainNavItems = mainNavItems.filter((item) => checkPerm(item.permissionKey))
  const visibleConfigNavItems = configNavItems.filter((item) => checkPerm(item.permissionKey))

  const checkIsActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <BreadcrumbProvider>
      <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800 antialiased overflow-x-clip w-full">
        {/* Sidebar Lateral */}
        <aside
          className={`${isCollapsed ? 'w-20' : 'w-64'
            } bg-white border-r border-slate-200/80 hidden lg:flex flex-col justify-between shrink-0 fixed inset-y-0 z-20 ${isMounted ? 'transition-all duration-300 ease-in-out' : ''
            }`}
        >
          {/* Botão flutuante na borda para recolher/expandir */}
          <button
            type="button"
            onClick={toggleSidebar}
            className="absolute -right-3.5 top-6 z-30 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-600 shadow-xs hover:bg-slate-50 hover:text-blue-600 transition-all cursor-pointer hover:scale-110 active:scale-95"
            title={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>

          <div
            onScroll={() => setIsCollapsedFinancialOpen(false)}
            className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden"
          >
            {/* Logo & Nome da Empresa / Seletor de Escritório */}
            <div className="p-3 border-b border-slate-100 relative">
              {isCollapsed ? (
                <button
                  type="button"
                  onClick={() => setIsOrgMenuOpen(!isOrgMenuOpen)}
                  className="flex items-center justify-center w-full group cursor-pointer"
                  title={`${officeName} (Clique para alternar escritório)`}
                >
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-slate-800 shadow-xs overflow-hidden shrink-0 border border-slate-200/80 group-hover:scale-105 transition-transform p-1">
                    {orgLogoUrl ? (
                      <img
                        src={orgLogoUrl}
                        alt={officeName}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <img
                        src="/logos/logo-organizeasy-quadrado.webp"
                        alt={officeName}
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsOrgMenuOpen(!isOrgMenuOpen)}
                  className="w-full flex items-center justify-between gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors text-left group cursor-pointer border border-transparent hover:border-slate-200"
                  title="Clique para alternar escritório"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center text-slate-800 shadow-xs overflow-hidden shrink-0 border border-slate-200/80 group-hover:scale-105 transition-transform p-0.5">
                      {orgLogoUrl ? (
                        <img
                          src={orgLogoUrl}
                          alt={officeName}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <img
                          src="/logos/logo-organizeasy-quadrado.webp"
                          alt={officeName}
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-900 leading-snug line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {officeName}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 block truncate">
                        {userRole}
                      </span>
                    </div>
                  </div>
                  <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-slate-600" />
                </button>
              )}

              {/* Dropdown Menu do Seletor de Escritórios */}
              {isOrgMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOrgMenuOpen(false)}
                  />
                  <div
                    className={`absolute ${isCollapsed ? 'left-20 top-2' : 'left-2 right-2 top-16'
                      } z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl p-2 animate-in fade-in zoom-in-95 min-w-[240px]`}
                  >
                    <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Seus Escritórios ({userOrganizations.length})
                      </span>
                    </div>

                    <div className="py-1 max-h-60 overflow-y-auto space-y-1">
                      {userOrganizations.map((o) => {
                        const isActive = o.id === (activeOrgId || organizationId)
                        const isSwitching = switchingOrgId === o.id

                        return (
                          <button
                            key={o.id}
                            type="button"
                            disabled={isSwitching}
                            onClick={async () => {
                              if (isActive || isSwitching) return
                              setSwitchingOrgId(o.id)
                              const res = await switchActiveOrganizationAction(o.id)
                              if (res.success) {
                                setIsOrgMenuOpen(false)
                                // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                                window.location.href = '/app'
                                return
                              }
                              setSwitchingOrgId(null)
                            }}
                            className={`w-full flex items-center justify-between gap-2.5 p-2 rounded-xl text-left transition-colors cursor-pointer ${isActive
                              ? 'bg-blue-50/80 text-blue-900 font-semibold'
                              : 'hover:bg-slate-50 text-slate-700'
                              }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0 overflow-hidden p-0.5">
                                {o.logo_url ? (
                                  <img
                                    src={o.logo_url}
                                    alt={o.name}
                                    className="w-full h-full object-cover rounded"
                                  />
                                ) : (
                                  <img
                                    src="/logos/logo-organizeasy-quadrado.webp"
                                    alt={o.name}
                                    className="w-full h-full object-contain"
                                  />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold block truncate">
                                  {o.name}
                                </span>
                                <span className="text-[10px] text-slate-400 block font-normal capitalize">
                                  {o.profile_name || (o.is_owner ? 'Proprietário' : 'Membro')}
                                </span>
                              </div>
                            </div>

                            {isSwitching ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
                            ) : isActive ? (
                              <Check className="w-4 h-4 text-blue-600 shrink-0" />
                            ) : null}
                          </button>
                        )
                      })}
                    </div>

                    <div className="pt-1 mt-1 border-t border-slate-100">
                      <Link
                        href="/onboarding"
                        onClick={() => setIsOrgMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Criar novo escritório</span>
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Botão de Ação Rápida: Novo Projeto */}
            {(isOwner || userPermissions?.projects_create !== false) && (
              <div className="p-3">
                {isCollapsed ? (
                  <div className="flex justify-center">
                    <Link
                      href="/app/projetos/novo"
                      className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs shadow-blue-500/20 group hover:scale-105"
                      title="Novo Projeto"
                    >
                      <Plus className="w-5 h-5" />
                    </Link>
                  </div>
                ) : (
                  <Link
                    href="/app/projetos/novo"
                    className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shadow-xs shadow-blue-500/20"
                    title="Novo Projeto"
                  >
                    <Plus className="w-4.5 h-4.5 shrink-0" />
                    <span>Novo Projeto</span>
                  </Link>
                )}
              </div>
            )}

            {/* Links de Navegação Principal */}
            <nav className="px-3 space-y-1">
              {/* Categoria Escritório */}
              {isCollapsed ? (
                <div
                  className="my-2 mx-2 border-t border-slate-100"
                  title="Escritório"
                />
              ) : (
                <div className="pt-2 pb-1.5 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Escritório
                </div>
              )}

              {visibleMainNavItems.map((item) => {
                const isActive = checkIsActive(item.href, item.exact)
                const Icon = item.icon
                const hasSub = 'subItems' in item && Boolean(item.subItems?.length)
                const isParentActive = pathname.startsWith(item.href)

                if (isCollapsed) {
                  if (hasSub && item.subItems) {
                    return (
                      <div key={item.href} className="relative flex justify-center">
                        <button
                          ref={collapsedFinancialBtnRef}
                          type="button"
                          onClick={() => {
                            if (collapsedFinancialBtnRef.current) {
                              const rect = collapsedFinancialBtnRef.current.getBoundingClientRect()
                              setCollapsedFinancialPos({
                                top: Math.max(16, Math.min(rect.top - 4, window.innerHeight - 260)),
                                left: rect.right + 10,
                              })
                            }
                            setIsCollapsedFinancialOpen((prev) => !prev)
                          }}
                          title={item.label}
                          className={`flex items-center justify-center w-11 h-11 mx-auto rounded-xl transition-all relative cursor-pointer ${isParentActive || isCollapsedFinancialOpen
                            ? 'bg-slate-100 text-blue-600 font-semibold shadow-2xs ring-2 ring-blue-500/20'
                            : 'text-slate-700 hover:bg-slate-100/80 hover:text-blue-600'
                            }`}
                          aria-label={`Abrir submenus de ${item.label}`}
                          aria-expanded={isCollapsedFinancialOpen}
                        >
                          <Icon className="w-5 h-5 shrink-0" />
                          <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-blue-600 border-2 border-white" />
                        </button>

                        {/* Submenu Suspenso apenas ao CLICAR */}
                        {isCollapsedFinancialOpen && collapsedFinancialPos && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setIsCollapsedFinancialOpen(false)}
                            />
                            <div
                              className="fixed z-50 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150 text-left"
                              style={{
                                top: `${collapsedFinancialPos.top}px`,
                                left: `${collapsedFinancialPos.left}px`,
                              }}
                            >
                              <div className="px-3 py-2 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-slate-800">
                                  <Icon className="w-4 h-4 text-blue-600" />
                                  {item.label}
                                </span>
                              </div>
                              <div className="py-1 space-y-1">
                                {item.subItems.map((sub) => {
                                  const isSubActive = sub.exact
                                    ? pathname === sub.href
                                    : pathname === sub.href || pathname.startsWith(sub.href + '/')
                                  const SubIcon = sub.icon

                                  return (
                                    <Link
                                      key={sub.href}
                                      href={sub.href}
                                      onClick={() => setIsCollapsedFinancialOpen(false)}
                                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${isSubActive
                                        ? 'bg-blue-50 text-blue-700 font-bold shadow-2xs'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                                        }`}
                                    >
                                      {SubIcon && (
                                        <SubIcon
                                          className={`w-4 h-4 shrink-0 ${isSubActive ? 'text-blue-600' : 'text-slate-400'
                                            }`}
                                        />
                                      )}
                                      <span className="truncate">{sub.label}</span>
                                    </Link>
                                  )
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      className={`flex items-center justify-center w-11 h-11 mx-auto rounded-xl transition-all relative group ${isActive
                        ? 'bg-slate-100 text-blue-600 font-semibold shadow-2xs'
                        : 'text-slate-700 hover:bg-slate-100/80 hover:text-blue-600'
                        }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      {item.badge && item.badge > 0 ? (
                        <span
                          className="absolute top-2 right-2 flex h-2 w-2"
                          title={`${item.badge} solicitação(ões) pendente(s)`}
                        >
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                        </span>
                      ) : null}
                    </Link>
                  )
                }

                if (hasSub && item.subItems) {
                  return (
                    <div key={item.href} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setIsFinancialMenuOpen((prev) => !prev)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all group select-none cursor-pointer ${isParentActive
                          ? 'bg-slate-100 text-blue-600 font-semibold shadow-2xs'
                          : 'text-slate-700 hover:bg-slate-100/80 hover:text-blue-600 font-medium'
                          }`}
                        aria-label={
                          isFinancialMenuOpen
                            ? `Recolher submenus de ${item.label}`
                            : `Expandir submenus de ${item.label}`
                        }
                        title={isFinancialMenuOpen ? 'Recolher submenus' : 'Expandir submenus'}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Icon
                            className={`w-4.5 h-4.5 shrink-0 ${isParentActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-blue-600'
                              }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        <div className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0">
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${isFinancialMenuOpen ? 'rotate-180 text-blue-600' : ''
                              }`}
                          />
                        </div>
                      </button>

                      {/* Submenus com animação suave e linha conectora */}
                      {isFinancialMenuOpen && (
                        <div className="ml-4 pl-3 border-l-2 border-slate-200/80 space-y-1 py-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                          {item.subItems.map((sub) => {
                            const isSubActive = sub.exact
                              ? pathname === sub.href
                              : pathname === sub.href || pathname.startsWith(sub.href + '/')
                            const SubIcon = sub.icon

                            return (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-all ${isSubActive
                                  ? 'bg-blue-50 text-blue-700 font-bold shadow-2xs'
                                  : 'text-slate-600 hover:bg-slate-100/70 hover:text-blue-600 font-medium'
                                  }`}
                              >
                                {SubIcon && (
                                  <SubIcon
                                    className={`w-4 h-4 shrink-0 ${isSubActive ? 'text-blue-600' : 'text-slate-400'
                                      }`}
                                  />
                                )}
                                <span className="truncate">{sub.label}</span>
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all group ${isActive
                      ? 'bg-slate-100 text-blue-600 font-semibold shadow-2xs'
                      : 'text-slate-700 hover:bg-slate-100/80 hover:text-blue-600 font-medium'
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="w-4.5 h-4.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && item.badge > 0 ? (
                      <span
                        className="flex h-2 w-2 relative shrink-0"
                        title={`${item.badge} solicitação(ões) de atualização cadastral pendente(s)`}
                      >
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                      </span>
                    ) : null}
                  </Link>
                )
              })}

              {/* Separador de Configurações */}
              {isCollapsed ? (
                <div
                  className="my-3 mx-2 border-t border-slate-100"
                  title="Configurações"
                />
              ) : (
                <div className="pt-4 pb-1.5 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Configurações
                </div>
              )}

              {/* Links de Configuração */}
              {visibleConfigNavItems.map((item) => {
                const isActive = checkIsActive(item.href)
                const Icon = item.icon

                if (isCollapsed) {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      className={`flex items-center justify-center w-11 h-11 mx-auto rounded-xl transition-all relative group ${isActive
                        ? 'bg-slate-100 text-blue-600 font-semibold shadow-2xs'
                        : 'text-slate-700 hover:bg-slate-100/80 hover:text-blue-600'
                        }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                    </Link>
                  )
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive
                      ? 'bg-slate-100 text-blue-600 font-semibold shadow-2xs'
                      : 'text-slate-700 hover:bg-slate-100/80 hover:text-blue-600 font-medium'
                      }`}
                  >
                    <Icon className="w-4.5 h-4.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Rodapé / Card de Perfil do Usuário */}
          <div className="p-3 border-t border-slate-100">
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-2">
                <Link
                  href="/app/configuracoes/perfil"
                  className="flex items-center justify-center group"
                  title={`Perfil: ${userDisplayName} (${userRole})`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-2xs border border-white group-hover:scale-105 transition-transform">
                    {userAvatarUrl ? (
                      <img
                        src={userAvatarUrl}
                        alt={userDisplayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{getInitials(userDisplayName)}</span>
                    )}
                  </div>
                </Link>

                <form action={logoutAction} className="shrink-0">
                  <button
                    type="submit"
                    title="Sair da Conta"
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <LogOut className="w-4.5 h-4.5" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-slate-50 transition-colors group">
                <Link
                  href="/app/configuracoes/perfil"
                  className="flex items-center gap-2.5 flex-1 min-w-0"
                  title="Acessar Configurações de Perfil"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-2xs border border-white">
                    {userAvatarUrl ? (
                      <img
                        src={userAvatarUrl}
                        alt={userDisplayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{getInitials(userDisplayName)}</span>
                    )}
                  </div>
                  <div className="truncate">
                    <span className="text-sm font-semibold text-slate-800 block truncate group-hover:text-blue-600 transition-colors">
                      {userDisplayName}
                    </span>
                    <span className="text-xs font-medium text-slate-400 capitalize block truncate">
                      {userRole}
                    </span>
                  </div>
                </Link>

                <form action={logoutAction} className="shrink-0">
                  <button
                    type="submit"
                    title="Sair da Conta"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </aside>

        {/* Conteúdo Principal com padding dinâmico */}
        <div
          className={`${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
            } pl-0 flex-1 flex flex-col min-w-0 w-full overflow-x-clip ${isMounted ? 'transition-all duration-300 ease-in-out' : ''
            }`}
        >
          <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              {/* Logotipo do escritório ativo visível apenas em telas menores que 1024px (< lg) */}
              <Link
                href="/app"
                title={`Escritório ativo: ${officeName} (Ir para Visão Geral)`}
                className="lg:hidden shrink-0 flex items-center group focus:outline-hidden"
              >
                <div className="h-7 w-7 rounded-lg bg-white flex items-center justify-center text-slate-800 shadow-xs overflow-hidden shrink-0 border border-slate-200/80 group-hover:border-blue-400 group-hover:scale-105 transition-all p-0.5">
                  {orgLogoUrl ? (
                    <img
                      src={orgLogoUrl}
                      alt={officeName}
                      className="w-full h-full object-cover rounded-md"
                    />
                  ) : (
                    <img
                      src="/logos/logo-organizeasy-quadrado.webp"
                      alt={officeName}
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              </Link>

              <Breadcrumbs />
            </div>
          </header>

          <main className="p-4 sm:p-6 lg:p-8 pb-36 lg:pb-8 flex-1 max-w-[1600px] w-full mx-auto space-y-6 overflow-x-clip">
            {children}
          </main>
        </div>
      </div>

      {/* Menu Flutuante Inferior para Mobile e Tablet (< lg) renderizado de forma desacoplada para fixação absoluta no viewport */}
      <LiquidMorphFloatingMenu
        officeName={officeName}
        orgLogoUrl={orgLogoUrl}
        userDisplayName={userDisplayName}
        userAvatarUrl={userAvatarUrl}
        userRole={userRole}
        mainNavItems={visibleMainNavItems}
        configNavItems={visibleConfigNavItems}
        pendingClientUpdatesCount={pendingClientUpdatesCount}
        userOrganizations={userOrganizations}
        activeOrgId={activeOrgId || organizationId}
      />

      {/* Overlay de Transição ao Alternar Escritório */}
      {switchingOrgId && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex flex-col items-center justify-center gap-3 text-white pointer-events-auto animate-in fade-in duration-150">
          <div className="p-3.5 bg-blue-600 rounded-2xl border border-blue-400/40 shadow-2xl flex items-center gap-3 px-5">
            <Loader2 className="w-5 h-5 animate-spin text-white" />
            <span className="text-sm font-medium text-white">Carregando novo escritório...</span>
          </div>
        </div>
      )}
    </BreadcrumbProvider>
  )
}
