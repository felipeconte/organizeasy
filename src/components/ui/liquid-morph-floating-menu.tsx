/* eslint-disable @next/next/no-img-element */
'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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

export interface FloatingNavItem {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
  badge?: number
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
  const [showOffice, setShowOffice] = useState(true)
  const [showConfig, setShowConfig] = useState(false)
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false)
  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null)

  const pathname = usePathname()
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)

  // Fecha o menu quando a rota muda durante a renderização (padrão oficial do React 19 para prev props/state)
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setIsOpen(false)
    setShowOffice(true)
    setShowConfig(false)
    setShowOrgSwitcher(false)
  }

  // Alterna seletor de escritórios: quando abre, fecha as categorias para dar espaço total à lista
  const toggleOrgSwitcher = () => {
    setShowOrgSwitcher((prev) => {
      const next = !prev
      if (next) {
        setShowOffice(false)
        setShowConfig(false)
      }
      return next
    })
  }

  // Alterna categoria Escritório: fecha o seletor de escritórios se estiver aberto
  const toggleOffice = () => {
    setShowOffice((prev) => {
      const next = !prev
      if (next) {
        setShowOrgSwitcher(false)
      }
      return next
    })
  }

  // Alterna categoria Configurações: fecha o seletor de escritórios se estiver aberto
  const toggleConfig = () => {
    setShowConfig((prev) => {
      const next = !prev
      if (next) {
        setShowOrgSwitcher(false)
      }
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
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden cursor-pointer"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Container Flutuante Centralizado na Base (nunca ultrapassa o topo da tela) */}
      <div
        ref={menuRef}
        className="fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 lg:hidden pointer-events-none w-[calc(100vw-2rem)] max-w-[390px] max-h-[calc(100dvh-2.5rem)] flex flex-col items-center justify-end"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <AnimatePresence mode="wait">
          {!isOpen ? (
            /* Botão Pill Fechado - Liquid Glass */
            <motion.button
              key="closed-pill"
              type="button"
              layoutId="floating-menu-container"
              onClick={() => setIsOpen(true)}
              className="pointer-events-auto group relative flex items-center justify-between gap-3 px-5 py-3 rounded-full bg-slate-900/85 backdrop-blur-xl border border-white/20 text-white shadow-[0_12px_36px_rgba(15,23,42,0.35)] hover:shadow-[0_16px_42px_rgba(15,23,42,0.45)] hover:bg-slate-900/95 active:scale-95 transition-all duration-200 cursor-pointer overflow-hidden"
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
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
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />

              <div className="flex items-center gap-2.5">
                {/* Ícone ou Indicador do Módulo Ativo */}
                {activeItem?.icon ? (
                  <activeItem.icon className="w-4 h-4 text-blue-400 shrink-0" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                )}

                <span className="text-sm font-semibold tracking-wide text-white">
                  Menu
                </span>

                {/* Badge de notificações pendentes se houver */}
                {pendingClientUpdatesCount > 0 && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                  </span>
                )}
              </div>

              {/* Ícone de 2 barras horizontais paralelas estilizado */}
              <div className="flex flex-col justify-center items-center gap-1 w-4.5 h-4.5 text-white/90">
                <span className="w-4 h-0.5 bg-white/90 rounded-full transition-all group-hover:w-4.5" />
                <span className="w-3.5 h-0.5 bg-white/70 rounded-full transition-all group-hover:w-4.5" />
              </div>
            </motion.button>
          ) : (
            /* Card Expandido - Liquid Glass Dark com altura limitada ao topo da tela */
            <motion.div
              key="expanded-card"
              layoutId="floating-menu-container"
              className="pointer-events-auto relative w-full rounded-[28px] bg-slate-950/90 backdrop-blur-2xl border border-white/15 text-white shadow-[0_24px_60px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col max-h-[calc(100dvh-3.5rem)]"
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
              {/* Efeito Glow / Gradiente Líquido no topo */}
              <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-blue-500/10 via-indigo-500/5 to-transparent pointer-events-none" />

              {/* Cabeçalho do Card: Informações do Escritório & Perfil */}
              <div className="p-4 border-b border-white/10 shrink-0">
                <div className="flex items-center justify-between gap-3">
                  {/* Seletor / Nome do Escritório */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 overflow-hidden p-1 shadow-inner">
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
                      <span className="text-[11px] text-white/50 block truncate">
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
                          ? 'bg-blue-600/30 text-blue-200 border-blue-400/30'
                          : 'bg-white/10 hover:bg-white/15 border-white/10 text-white/80 hover:text-white'
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
                      className="mt-3 pt-3 border-t border-white/10 space-y-2 overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                          Seus Escritórios ({userOrganizations.length})
                        </span>
                        <span className="text-[10px] text-white/40">
                          Selecione para alternar
                        </span>
                      </div>

                      {/* Lista de Escritórios com Barra de Rolagem Suave */}
                      <div className="max-h-[min(50dvh,320px)] overflow-y-auto overscroll-contain space-y-1.5 pr-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-white/5">
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
                                  router.refresh()
                                }
                                setSwitchingOrgId(null)
                              }}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors text-left ${
                                isCurrent
                                  ? 'bg-blue-600/35 text-white font-semibold border border-blue-400/40 shadow-inner'
                                  : 'text-white/70 hover:bg-white/10 hover:text-white border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                                <Building2
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    isCurrent ? 'text-blue-300' : 'text-white/40'
                                  }`}
                                />
                                <span className="truncate">{org.name}</span>
                              </div>
                              {isSwitching ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0" />
                              ) : isCurrent ? (
                                <span className="px-1.5 py-0.5 rounded-md bg-blue-500/20 text-[10px] font-bold text-blue-300 border border-blue-400/30 flex items-center gap-1 shrink-0">
                                  <Check className="w-3 h-3 text-blue-400" /> Ativo
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
              <div className="p-3 overflow-y-auto overscroll-contain flex-1 space-y-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                {/* 1. Categoria: Escritório (Aberta por padrão, fecha ao abrir troca de escritórios) */}
                <div>
                  <button
                    type="button"
                    onClick={toggleOffice}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm font-semibold cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1 rounded-lg bg-white/5 text-white/70">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span>Escritório</span>
                    </div>
                    {showOffice ? (
                      <ChevronUp className="w-4 h-4 text-white/50" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-white/50" />
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

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setIsOpen(false)}
                              className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 text-sm ${
                                isActive
                                  ? 'bg-white/15 text-white font-semibold border border-white/20 shadow-inner'
                                  : 'text-white/75 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                                    isActive
                                      ? 'bg-blue-500/30 text-blue-300'
                                      : 'bg-white/5 text-white/70 group-hover:text-white group-hover:bg-white/10'
                                  }`}
                                >
                                  <Icon className="w-4 h-4" />
                                </div>
                                <span className="font-medium tracking-wide truncate">
                                  {item.label}
                                </span>
                              </div>

                              {item.badge && item.badge > 0 ? (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                                  {item.badge}
                                </span>
                              ) : isActive ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#60A5FA] shrink-0" />
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
                  <div className="pt-1 border-t border-white/10">
                    <button
                      type="button"
                      onClick={toggleConfig}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm font-semibold cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1 rounded-lg bg-white/5 text-white/70">
                          <Settings className="w-4 h-4" />
                        </div>
                        <span>Configurações</span>
                      </div>
                      {showConfig ? (
                        <ChevronUp className="w-4 h-4 text-white/50" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-white/50" />
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
                                    ? 'bg-white/15 text-white font-semibold border border-white/20 shadow-inner'
                                    : 'text-white/75 hover:text-white hover:bg-white/10'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                                      isCfgActive
                                        ? 'bg-blue-500/30 text-blue-300'
                                        : 'bg-white/5 text-white/70 group-hover:text-white group-hover:bg-white/10'
                                    }`}
                                  >
                                    <CfgIcon className="w-4 h-4" />
                                  </div>
                                  <span className="font-medium tracking-wide truncate">
                                    {cfg.label}
                                  </span>
                                </div>

                                {isCfgActive ? (
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#60A5FA] shrink-0" />
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
              <div className="p-3 px-4 bg-white/5 border-t border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  {/* Atalho direto para Perfil com Mini Avatar */}
                  <Link
                    href="/app/configuracoes/perfil"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0 border border-white/20 shadow-xs">
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
                      className="p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </form>
                </div>

                {/* Botão Fechar X */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-all active:scale-90 cursor-pointer"
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
    </>
  )
}

export { LiquidMorphFloatingMenu as FloatingMenu }
