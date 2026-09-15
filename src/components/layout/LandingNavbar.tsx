'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import {
  Menu,
  X,
  ChevronDown,
  Sparkles,
  ArrowRight,
  UserCheck,
  Calculator,
  Layers,
  ShieldCheck,
  MessageSquare,
  HelpCircle,
  LogIn,
  Compass
} from 'lucide-react'

interface NavSectionItem {
  name: string
  href: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

const NAV_ITEMS: NavSectionItem[] = [
  {
    name: 'Recursos',
    href: '#recursos',
    description: 'Cronogramas em Lista, Kanban, Gantt e automações',
    icon: Layers,
    badge: 'Popular'
  },
  {
    name: 'Simulador',
    href: '#simulador',
    description: 'Calcule o retorno e horas economizadas no mês',
    icon: Calculator
  },
  {
    name: 'Como Funciona',
    href: '#como-funciona',
    description: 'Do briefing ao carimbo digital de aprovação',
    icon: Compass
  },
  {
    name: 'Diferenciais',
    href: '#diferenciais',
    description: 'Auditoria de entrega, segurança RLS e portal sem senha',
    icon: ShieldCheck
  },
  {
    name: 'Depoimentos',
    href: '#depoimentos',
    description: 'Histórias reais de arquitetos e gestores de projetos',
    icon: MessageSquare
  },
  {
    name: 'FAQ',
    href: '#faq',
    description: 'Dúvidas frequentes sobre planos e funcionamento',
    icon: HelpCircle
  }
]

export function LandingNavbar() {
  const [mounted, setMounted] = useState(false)
  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  // Desktop collapsed dropdown state
  const [desktopDropdownOpen, setDesktopDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close desktop dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDesktopDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenuOpen])

  // Close on Escape key press
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
        setDesktopDropdownOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleLinkClick = () => {
    setMobileMenuOpen(false)
    setDesktopDropdownOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <div className="flex items-center gap-4 shrink-0">
          <Link href="/" className="flex items-center gap-2 group focus:outline-hidden">
            <Image
              src="/logos/logo-organize.webp"
              alt="Organizeasy"
              width={160}
              height={36}
              priority
              className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-[1.02]"
            />
          </Link>
        </div>

        {/* Desktop Collapsed Navigation Trigger ("Explorar" Menu Dropdown) */}
        <div className="hidden md:flex items-center gap-2" ref={dropdownRef}>
          {/* Main Collapsed Menu Trigger Button */}
          <div className="relative">
            <button
              onClick={() => setDesktopDropdownOpen(!desktopDropdownOpen)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                desktopDropdownOpen
                  ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-500/20 shadow-xs'
                  : 'text-slate-700 hover:text-blue-600 hover:bg-slate-100/80'
              }`}
              aria-expanded={desktopDropdownOpen}
              aria-haspopup="true"
            >
              <Compass className={`w-4 h-4 transition-transform duration-200 ${desktopDropdownOpen ? 'text-blue-600 rotate-45' : 'text-slate-500'}`} />
              <span>Explorar Plataforma</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  desktopDropdownOpen ? 'rotate-180 text-blue-600' : ''
                }`}
              />
            </button>

            {/* Desktop Rich Dropdown Popover */}
            {desktopDropdownOpen && (
              <div className="absolute top-full left-0 mt-2.5 w-[560px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-200/80 p-3 z-50 animate-in fade-in-0 zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Navegue pelas seções</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">6 recursos disponíveis</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-2">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon
                    return (
                      <a
                        key={item.name}
                        href={item.href}
                        onClick={handleLinkClick}
                        className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-blue-50/70 transition-all border border-transparent hover:border-blue-100 text-left cursor-pointer"
                      >
                        <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-600 flex items-center justify-center transition-colors shadow-2xs">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors whitespace-nowrap">
                              {item.name}
                            </span>
                            {item.badge && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-blue-100 text-blue-700">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1 leading-snug mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </a>
                    )
                  })}
                </div>

                {/* Bottom Card Inside Dropdown */}
                <div className="mt-2 pt-2 border-t border-slate-100 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-50/60 to-indigo-50/60 flex items-center justify-between">
                  <div className="text-xs text-slate-700">
                    <span className="font-semibold text-blue-900">Portal do Cliente sem senha</span>
                    <span className="hidden sm:inline text-slate-500 ml-1.5">— aprovações com validade e auditoria</span>
                  </div>
                  <Link
                    href="/portal/login"
                    onClick={handleLinkClick}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 shrink-0"
                  >
                    <span>Testar</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Quick Direct Anchors (for wider desktop viewports) */}
          <div className="hidden lg:flex items-center gap-1 pl-2 border-l border-slate-200">
            <a
              href="#recursos"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-100/70 transition-colors whitespace-nowrap"
            >
              Recursos
            </a>
            <a
              href="#simulador"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-100/70 transition-colors whitespace-nowrap"
            >
              Simulador
            </a>
            <a
              href="#como-funciona"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-100/70 transition-colors whitespace-nowrap"
            >
              Como Funciona
            </a>
          </div>
        </div>

        {/* Header Action Buttons (Always preserved & neatly aligned) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Portal Client Tracking Pill */}
          <Link
            href="/portal/login"
            className="flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50/90 hover:bg-blue-100 border border-blue-200/90 transition-all shadow-2xs whitespace-nowrap shrink-0"
            title="Acessar o portal do cliente para aprovação de projetos"
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="hidden xl:inline">Acompanhar meu projeto</span>
            <span className="xl:hidden">Portal</span>
          </Link>

          {/* Office Login Link */}
          <Link
            href="/login"
            className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition-all hidden md:inline-block whitespace-nowrap shrink-0"
          >
            Área do Escritório
          </Link>

          {/* Main CTA: Criar Escritório */}
          <Link
            href="/cadastro"
            className="flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-semibold transition-all shadow-sm shadow-blue-500/25 whitespace-nowrap shrink-0"
          >
            <span>Criar Escritório</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </Link>

          {/* Mobile/Tablet Menu Button Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-all focus:outline-hidden shrink-0 cursor-pointer"
            aria-label="Abrir menu de navegação"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Slide-Over Modal montado via Portal diretamente no body */}
      {mounted &&
        mobileMenuOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] md:hidden">
            {/* Backdrop Blur Overlay cobrindo a tela toda */}
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200 cursor-pointer"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Sliding Panel ocupando a lateral completa da tela */}
            <div className="fixed inset-y-0 right-0 w-full max-w-[340px] sm:max-w-sm h-screen bg-white shadow-2xl border-l border-slate-200 flex flex-col justify-between z-[10000] overflow-y-auto animate-in slide-in-from-right duration-250 ease-out">
              {/* Drawer Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white/90 sticky top-0 z-10 backdrop-blur-md">
                <Link href="/" onClick={handleLinkClick} className="flex items-center gap-2">
                  <Image
                    src="/logos/logo-organize.webp"
                    alt="Organizeasy"
                    width={140}
                    height={32}
                    className="h-7 w-auto object-contain"
                  />
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80 transition-colors cursor-pointer"
                  aria-label="Fechar menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body: Navigation Sections */}
              <div className="p-4 sm:p-5 space-y-6 flex-1">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1">
                    Explorar a Plataforma
                  </div>
                  <div className="space-y-1.5">
                    {NAV_ITEMS.map((item) => {
                      const Icon = item.icon
                      return (
                        <a
                          key={item.name}
                          href={item.href}
                          onClick={handleLinkClick}
                          className="flex items-center gap-3 p-2.5 rounded-xl text-slate-700 hover:text-blue-600 hover:bg-blue-50/70 border border-transparent hover:border-blue-100 transition-all cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold">{item.name}</span>
                              {item.badge && (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-blue-100 text-blue-700">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </a>
                      )
                    })}
                  </div>
                </div>

                {/* Drawer Quick Actions */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1">
                    Acessos Rápidos
                  </div>
                  <div className="space-y-2">
                    <Link
                      href="/portal/login"
                      onClick={handleLinkClick}
                      className="flex items-center justify-between p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 text-blue-800 text-xs font-bold hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-blue-600" />
                        <span>Acompanhar meu projeto</span>
                      </div>
                      <span className="text-[10px] uppercase tracking-wide bg-blue-200/70 px-2 py-0.5 rounded-md text-blue-900">
                        Cliente
                      </span>
                    </Link>

                    <Link
                      href="/login"
                      onClick={handleLinkClick}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <LogIn className="w-4 h-4 text-slate-600" />
                        <span>Área do Escritório</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Drawer Footer with Primary CTA */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 space-y-2.5 sticky bottom-0">
                <Link
                  href="/cadastro"
                  onClick={handleLinkClick}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all"
                >
                  <span>Criar Escritório Grátis</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <p className="text-[11px] text-center text-slate-500">
                  14 dias de teste grátis • Sem cartão de crédito
                </p>
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  )
}
