/* eslint-disable @next/next/no-img-element */
'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import {
  X,
  ChevronUp,
  ChevronDown,
  LogOut,
  ChevronsUpDown,
  Check,
  Building2,
  Settings,
  LucideIcon,
  Loader2,
} from 'lucide-react'
import { logoutAction } from '@/lib/actions/auth'
import { switchActiveOrganizationAction } from '@/lib/actions/organization'
import type { UserOrganizationItem } from '@/types/organization'

export interface FloatingSubNavItem {
  href: string
  label: string
  icon?: LucideIcon
  exact?: boolean
}

export interface FloatingNavItem {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
  badge?: number
  subItems?: FloatingSubNavItem[]
}

export interface FloatingConfigNavItem {
  href: string
  label: string
  icon: LucideIcon
}

export interface LiquidMorphFloatingMenuProps {
  officeName: string
  orgLogoUrl: string | null
  userDisplayName: string
  userAvatarUrl: string | null
  userRole: string
  mainNavItems: FloatingNavItem[]
  configNavItems: FloatingConfigNavItem[]
  pendingClientUpdatesCount?: number
  userOrganizations?: UserOrganizationItem[]
  activeOrgId?: string
}

type OpenCategory = 'office' | 'config' | 'none'
const STORAGE_KEY = 'organizeasy_floating_menu_active_category'

export default function LiquidMorphFloatingMenu({
  officeName,
  orgLogoUrl,
  userDisplayName,
  userAvatarUrl,
  userRole,
  mainNavItems,
  configNavItems,
  pendingClientUpdatesCount = 0,
  userOrganizations = [],
  activeOrgId,
}: LiquidMorphFloatingMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<OpenCategory>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved === 'office' || saved === 'config' || saved === 'none') {
          return saved as OpenCategory
        }
      } catch {
        // Ignora erro em ambientes restritos de armazenamento
      }
    }
    return 'office'
  })
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false)
  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null)

  const pathname = usePathname()
  const menuRef = useRef<HTMLDivElement>(null)
  const [expandedSubMenu, setExpandedSubMenu] = useState<string | null>(() =>
    pathname.startsWith('/app/financeiro') ? '/app/financeiro' : null
  )

  // Fecha o menu e sincroniza submenus quando a rota muda sem apagar a categoria salva
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setIsOpen(false)
    setShowOrgSwitcher(false)
    if (pathname.startsWith('/app/financeiro')) {
      setExpandedSubMenu('/app/financeiro')
    }
  }

  const showOffice = !showOrgSwitcher && activeCategory === 'office'
  const showConfig = !showOrgSwitcher && activeCategory === 'config'

  // Alterna seletor de escritórios: ao abrir, recolhe as categorias para dar espaço total à lista
  const toggleOrgSwitcher = () => {
    setShowOrgSwitcher((prev) => !prev)
  }

  // Alterna categoria Escritório: ao abrir, fecha Configurações e seletor de escritórios e persiste escolha
  const toggleOffice = () => {
    setShowOrgSwitcher(false)
    setActiveCategory((prev) => {
      if (showOrgSwitcher && prev === 'office') {
        return 'office'
      }
      const next: OpenCategory = prev === 'office' ? 'none' : 'office'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch { }
      return next
    })
  }

  // Alterna categoria Configurações: ao abrir, fecha Escritório e seletor de escritórios e persiste escolha
  const toggleConfig = () => {
    setShowOrgSwitcher(false)
    setActiveCategory((prev) => {
      if (showOrgSwitcher && prev === 'config') {
        return 'config'
      }
      const next: OpenCategory = prev === 'config' ? 'none' : 'config'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch { }
      return next
    })
  }

  // Fecha com a tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Previne rolagem de fundo quando o menu está expandido em dispositivos móveis
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const checkIsActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  const getInitials = (name: string) => {
    if (!name) return 'OE'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const activeItem = mainNavItems.find((item) => checkIsActive(item.href, item.exact))

  return (
    <>
      {/* Backdrop com desfoque de vidro suave quando o menu está aberto */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="floating-menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs lg:hidden cursor-pointer"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Container Flutuante Centralizado e Grudado na Barra Inferior da Tela */}
      <div
        ref={menuRef}
        className="fixed bottom-0 left-0 right-0 w-full max-w-[100vw] z-50 lg:hidden pointer-events-none flex flex-col items-center justify-end pb-3 sm:pb-3.5"
        style={{
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '100vw',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))',
        }}
      >
        <AnimatePresence mode="wait">
          {!isOpen ? (
            /* Botão Pill Fechado - Tom de Azul Padrão do Sistema (blue-600) */
            <motion.button
              key="closed-pill"
              type="button"
              onClick={() => setIsOpen(true)}
              className="pointer-events-auto group relative flex items-center justify-between gap-3 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 border border-blue-400/40 text-white shadow-[0_8px_30px_rgba(37,99,235,0.45)] hover:shadow-[0_12px_36px_rgba(37,99,235,0.55)] transition-all duration-200 cursor-pointer overflow-hidden"
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{
                type: 'spring',
                stiffness: 380,
                damping: 26,
              }}
              aria-label="Abrir menu de navegação"
              aria-expanded={false}
            >
              {/* Reflexo luminoso sutil */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />

              <div className="flex items-center gap-2.5">
                {/* Ícone ou Indicador do Módulo Ativo */}
                {activeItem?.icon ? (
                  <activeItem.icon className="w-4 h-4 text-white shrink-0" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                )}

                <span className="text-sm font-semibold tracking-wide text-white">
                  Menu
                </span>

                {/* Badge de notificações pendentes se houver */}
                {pendingClientUpdatesCount > 0 && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                  </span>
                )}
              </div>

              {/* Ícone de 2 barras horizontais paralelas estilizado */}
              <div className="flex flex-col justify-center items-center gap-1 w-4.5 h-4.5 text-white">
                <span className="w-4 h-0.5 bg-white rounded-full transition-all group-hover:w-4.5" />
                <span className="w-3.5 h-0.5 bg-blue-100 rounded-full transition-all group-hover:w-4.5" />
              </div>
            </motion.button>
          ) : (
            /* Card Expandido - Tom de Azul Padrão do Sistema (blue-600) */
            <motion.div
              key="expanded-card"
              className="pointer-events-auto relative w-[calc(100vw-1.5rem)] max-w-[400px] mb-2 rounded-[28px] bg-blue-600 border border-blue-400/40 text-white shadow-[0_24px_60px_rgba(29,78,216,0.45)] overflow-hidden flex flex-col max-h-[calc(100dvh-4rem)]"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{
                type: 'spring',
                stiffness: 350,
                damping: 28,
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Menu principal"
            >
              {/* Efeito Glow / Gradiente no topo */}
              <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-white/20 via-white/5 to-transparent pointer-events-none" />

              {/* Cabeçalho do Card: Informações do Escritório & Perfil */}
              <div className="p-4 border-b border-blue-500/80 shrink-0">
                <div className="flex items-center justify-between gap-3">
                  {/* Seletor / Nome do Escritório */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-xl bg-white border border-blue-300/40 flex items-center justify-center shrink-0 overflow-hidden p-1 shadow-xs">
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
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">
                          {officeName}
                        </span>
                      </div>
                      <span className="text-[11px] text-blue-100 block truncate">
                        {userDisplayName} • {userRole}
                      </span>
                    </div>
                  </div>

                  {/* Botão de Trocar Escritório se houver mais de um */}
                  {userOrganizations.length > 1 && (
                    <button
                      type="button"
                      onClick={toggleOrgSwitcher}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1 shrink-0 cursor-pointer ${
                        showOrgSwitcher
                          ? 'bg-white text-blue-700 border-white shadow-xs font-semibold'
                          : 'bg-white/15 hover:bg-white/25 border-white/20 text-white'
                      }`}
                      title={showOrgSwitcher ? 'Fechar lista de escritórios' : 'Alternar Escritório'}
                    >
                      <ChevronsUpDown className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Trocar</span>
                    </button>
                  )}
                </div>

                {/* Sub-menu suspenso de troca de escritório com barra de rolagem */}
                <AnimatePresence>
                  {showOrgSwitcher && userOrganizations.length > 1 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-blue-500/80 space-y-2 overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-bold text-blue-100/80 uppercase tracking-wider">
                          Seus Escritórios ({userOrganizations.length})
                        </span>
                        <span className="text-[10px] text-blue-100/70">
                          Selecione para alternar
                        </span>
                      </div>

                      {/* Lista de Escritórios com Barra de Rolagem Suave */}
                      <div className="max-h-[min(50dvh,320px)] overflow-y-auto overscroll-contain space-y-1.5 pr-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-blue-400/60 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-blue-700/40">
                        {userOrganizations.map((org) => {
                          const isCurrent = org.id === activeOrgId
                          const isSwitching = switchingOrgId === org.id

                          return (
                            <button
                              key={org.id}
                              type="button"
                              disabled={isCurrent || isSwitching}
                              onClick={async () => {
                                if (isCurrent || isSwitching) return
                                setSwitchingOrgId(org.id)
                                const res = await switchActiveOrganizationAction(org.id)
                                if (res.success) {
                                  setShowOrgSwitcher(false)
                                  setIsOpen(false)
                                  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                                  window.location.href = '/app'
                                  return
                                }
                                setSwitchingOrgId(null)
                              }}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors text-left ${
                                isCurrent
                                  ? 'bg-white text-blue-900 font-semibold border border-white/40 shadow-xs'
                                  : 'text-blue-50 hover:bg-white/15 hover:text-white border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                                <Building2
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    isCurrent ? 'text-blue-600' : 'text-blue-200'
                                  }`}
                                />
                                <span className="truncate">{org.name}</span>
                              </div>
                              {isSwitching ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-white shrink-0" />
                              ) : isCurrent ? (
                                <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-[10px] font-bold text-blue-800 border border-blue-200 flex items-center gap-1 shrink-0">
                                  <Check className="w-3 h-3 text-blue-600" /> Ativo
                                </span>
                              ) : null}
                            </button>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Corpo da Navegação com Categorias "Escritório" e "Configurações" */}
              <div className="p-3 overflow-y-auto overscroll-contain flex-1 space-y-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-blue-400/50 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                {/* 1. Categoria: Escritório (Aberta por padrão, fecha ao abrir troca de escritórios) */}
                <div>
                  <button
                    type="button"
                    onClick={toggleOffice}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-white/95 hover:text-white hover:bg-white/10 transition-colors text-sm font-semibold cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1 rounded-lg bg-white/15 text-white">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span>Escritório</span>
                    </div>
                    {showOffice ? (
                      <ChevronUp className="w-4 h-4 text-blue-200" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-blue-200" />
                    )}
                  </button>

                  <AnimatePresence initial={false}>
                    {showOffice && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pl-2 pr-1 pt-1 space-y-1 overflow-hidden"
                      >
                        {mainNavItems.map((item) => {
                          const isActive = checkIsActive(item.href, item.exact)
                          const Icon = item.icon
                          const hasSub = item.subItems && item.subItems.length > 0
                          const isSubOpen = hasSub && expandedSubMenu === item.href
                          const isParentActive = pathname.startsWith(item.href)

                          if (hasSub) {
                            return (
                              <div key={item.href} className="space-y-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExpandedSubMenu((prev) => (prev === item.href ? null : item.href))
                                  }}
                                  className={`w-full group relative flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 text-sm select-none cursor-pointer ${
                                    isParentActive
                                      ? 'bg-white text-blue-700 font-semibold shadow-xs border border-white/30'
                                      : 'text-blue-50 hover:text-white hover:bg-white/15 font-medium'
                                  }`}
                                  aria-label={
                                    isSubOpen
                                      ? `Recolher submenus de ${item.label}`
                                      : `Expandir submenus de ${item.label}`
                                  }
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <div
                                      className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                                        isParentActive
                                          ? 'bg-blue-50 text-blue-600'
                                          : 'bg-white/15 text-white group-hover:bg-white/25'
                                      }`}
                                    >
                                      <Icon className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium tracking-wide truncate">
                                      {item.label}
                                    </span>
                                  </div>

                                  <div className="p-1 rounded-lg text-blue-200 group-hover:text-white transition-colors shrink-0">
                                    <ChevronDown
                                      className={`w-4 h-4 transition-transform duration-200 ${
                                        isSubOpen ? 'rotate-180 text-white' : ''
                                      }`}
                                    />
                                  </div>
                                </button>

                                {/* Submenus no card mobile */}
                                <AnimatePresence initial={false}>
                                  {isSubOpen && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      className="ml-5 pl-3 border-l border-blue-400/50 space-y-1 py-1 overflow-hidden"
                                    >
                                      {item.subItems?.map((sub) => {
                                        const isSubActive = sub.exact
                                          ? pathname === sub.href
                                          : pathname === sub.href || pathname.startsWith(sub.href + '/')
                                        const SubIcon = sub.icon

                                        return (
                                          <Link
                                            key={sub.href}
                                            href={sub.href}
                                            onClick={() => setIsOpen(false)}
                                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${
                                              isSubActive
                                                ? 'bg-white text-blue-800 font-bold shadow-xs'
                                                : 'text-blue-100 hover:text-white hover:bg-white/15 font-medium'
                                            }`}
                                          >
                                            {SubIcon && (
                                              <SubIcon
                                                className={`w-4 h-4 shrink-0 ${
                                                  isSubActive ? 'text-blue-600' : 'text-blue-200'
                                                }`}
                                              />
                                            )}
                                            <span className="truncate">{sub.label}</span>
                                          </Link>
                                        )
                                      })}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )
                          }

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setIsOpen(false)}
                              className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 text-sm ${
                                isActive
                                  ? 'bg-white text-blue-700 font-semibold shadow-xs border border-white/30'
                                  : 'text-blue-50 hover:text-white hover:bg-white/15 font-medium'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                                    isActive
                                      ? 'bg-blue-50 text-blue-600'
                                      : 'bg-white/15 text-white group-hover:bg-white/25'
                                  }`}
                                >
                                  <Icon className="w-4 h-4" />
                                </div>
                                <span className="font-medium tracking-wide truncate">
                                  {item.label}
                                </span>
                              </div>

                              {item.badge && item.badge > 0 ? (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-slate-900 shadow-xs shrink-0">
                                  {item.badge}
                                </span>
                              ) : isActive ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_#3B82F6] shrink-0" />
                              ) : null}
                            </Link>
                          )
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 2. Categoria: Configurações (Colapsada por padrão, fecha ao abrir troca de escritórios) */}
                {configNavItems.length > 0 && (
                  <div className="pt-1 border-t border-blue-500/80">
                    <button
                      type="button"
                      onClick={toggleConfig}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-white/95 hover:text-white hover:bg-white/10 transition-colors text-sm font-semibold cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1 rounded-lg bg-white/15 text-white">
                          <Settings className="w-4 h-4" />
                        </div>
                        <span>Configurações</span>
                      </div>
                      {showConfig ? (
                        <ChevronUp className="w-4 h-4 text-blue-200" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-blue-200" />
                      )}
                    </button>

                    <AnimatePresence initial={false}>
                      {showConfig && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pl-2 pr-1 pt-1 space-y-1 overflow-hidden"
                        >
                          {configNavItems.map((cfg) => {
                            const isCfgActive = checkIsActive(cfg.href)
                            const CfgIcon = cfg.icon

                            return (
                              <Link
                                key={cfg.href}
                                href={cfg.href}
                                onClick={() => setIsOpen(false)}
                                className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 text-sm ${
                                  isCfgActive
                                    ? 'bg-white text-blue-700 font-semibold shadow-xs border border-white/30'
                                    : 'text-blue-50 hover:text-white hover:bg-white/15 font-medium'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                                      isCfgActive
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'bg-white/15 text-white group-hover:bg-white/25'
                                    }`}
                                  >
                                    <CfgIcon className="w-4 h-4" />
                                  </div>
                                  <span className="font-medium tracking-wide truncate">
                                    {cfg.label}
                                  </span>
                                </div>

                                {isCfgActive ? (
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_#3B82F6] shrink-0" />
                                ) : null}
                              </Link>
                            )
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Rodapé do Menu Expandido (Sem o texto "Menu", apenas perfil, logout e fechar) */}
              <div className="p-3 px-4 bg-blue-700/60 border-t border-blue-500/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  {/* Atalho direto para Perfil com Mini Avatar */}
                  <Link
                    href="/app/configuracoes/perfil"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium text-white hover:bg-white/15 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-white/20 border border-white/40 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-xs">
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
                    <span className="truncate">Meu Perfil</span>
                  </Link>

                  {/* Botão Sair */}
                  <form action={logoutAction} className="inline-flex">
                    <button
                      type="submit"
                      title="Sair da Conta"
                      className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-rose-500/30 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </form>
                </div>

                {/* Botão Fechar X */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full hover:bg-white/20 text-white transition-all active:scale-90 cursor-pointer"
                  title="Fechar menu"
                  aria-label="Fechar menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Overlay de Transição ao Alternar Escritório no Mobile */}
      {switchingOrgId && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex flex-col items-center justify-center gap-3 text-white pointer-events-auto animate-in fade-in duration-150">
          <div className="p-3.5 bg-blue-600 rounded-2xl border border-blue-400/40 shadow-2xl flex items-center gap-3 px-5">
            <Loader2 className="w-5 h-5 animate-spin text-white" />
            <span className="text-sm font-medium text-white">Carregando novo escritório...</span>
          </div>
        </div>
      )}
    </>
  )
}

export { LiquidMorphFloatingMenu as FloatingMenu }
