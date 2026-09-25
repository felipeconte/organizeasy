'use client'

import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react'
import { usePathname } from 'next/navigation'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbContextType {
  customBreadcrumbs: BreadcrumbItem[] | null
  setCustomBreadcrumbs: (items: BreadcrumbItem[] | null) => void
  breadcrumbs: BreadcrumbItem[]
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined)

export function getFallbackBreadcrumbs(pathname: string): BreadcrumbItem[] {
  // 1. Visão Geral / Início
  if (pathname === '/app') {
    return [
      { label: 'Escritório' },
      { label: 'Visão Geral' },
    ]
  }

  // 2. Configurações
  if (pathname.startsWith('/app/configuracoes')) {
    const configRoot: BreadcrumbItem = {
      label: 'Configurações',
    }

    if (pathname === '/app/configuracoes/etapas-fluxo') {
      return [configRoot, { label: 'Etapas do Projeto' }]
    }
    if (pathname === '/app/configuracoes/etapas') {
      return [configRoot, { label: 'Template de Tarefas' }]
    }
    if (pathname === '/app/configuracoes/escritorio') {
      return [configRoot, { label: 'Dados do Escritório' }]
    }
    if (pathname === '/app/configuracoes/perfis') {
      return [configRoot, { label: 'Perfis de Acesso' }]
    }
    if (pathname === '/app/configuracoes/perfil') {
      return [configRoot, { label: 'Meu Perfil' }]
    }
    return [configRoot]
  }

  // 3. Clientes
  if (pathname.startsWith('/app/clientes')) {
    const root: BreadcrumbItem = { label: 'Escritório' }
    if (pathname === '/app/clientes') {
      return [root, { label: 'Clientes' }]
    }
    return [
      root,
      { label: 'Clientes', href: '/app/clientes' },
      { label: 'Detalhes do Cliente' },
    ]
  }

  // 4. Projetos
  if (pathname.startsWith('/app/projetos')) {
    const root: BreadcrumbItem = { label: 'Escritório' }
    if (pathname === '/app/projetos') {
      return [root, { label: 'Projetos' }]
    }
    if (pathname === '/app/projetos/novo') {
      return [
        root,
        { label: 'Projetos', href: '/app/projetos' },
        { label: 'Novo Projeto' },
      ]
    }
    // Subrotas de projeto como /app/projetos/[id]/fornecedores etc.
    const parts = pathname.split('/').filter(Boolean) // ['app', 'projetos', id, subpage?]
    if (parts.length >= 4) {
      const projectId = parts[2]
      const subpage = parts[3]
      const subpageLabels: Record<string, string> = {
        fornecedores: 'Empresas e Serviços',
        financeiro: 'Financeiro',
        briefing: 'Briefing',
        auditoria: 'Auditoria',
      }
      return [
        root,
        { label: 'Projetos', href: '/app/projetos' },
        { label: 'Projeto', href: `/app/projetos/${projectId}` },
        { label: subpageLabels[subpage] || subpage },
      ]
    }
    // /app/projetos/[id]
    return [
      root,
      { label: 'Projetos', href: '/app/projetos' },
      { label: 'Detalhes do Projeto' },
    ]
  }

  // 5. Empresas e Serviços
  if (pathname.startsWith('/app/empresas')) {
    const root: BreadcrumbItem = { label: 'Escritório' }
    if (pathname === '/app/empresas') {
      return [root, { label: 'Empresas e Serviços' }]
    }
    return [
      root,
      { label: 'Empresas e Serviços', href: '/app/empresas' },
      { label: 'Detalhes da Empresa' },
    ]
  }

  // 6. Financeiro
  if (pathname.startsWith('/app/financeiro')) {
    const root: BreadcrumbItem = { label: 'Escritório' }
    const financeiroRoot: BreadcrumbItem = { label: 'Financeiro', href: '/app/financeiro' }

    if (pathname === '/app/financeiro') {
      return [root, { label: 'Financeiro' }, { label: 'Visão Geral' }]
    }
    if (pathname === '/app/financeiro/lancamentos') {
      return [root, financeiroRoot, { label: 'Lançamentos' }]
    }
    if (pathname === '/app/financeiro/lucratividade') {
      return [root, financeiroRoot, { label: 'Lucratividade por Projeto' }]
    }
    if (pathname === '/app/financeiro/projecao') {
      return [root, financeiroRoot, { label: 'Passado, Presente e Futuro' }]
    }
    return [root, { label: 'Financeiro' }]
  }

  // Fallback genérico para qualquer outra rota sob /app
  const segments = pathname.replace('/app', '').split('/').filter(Boolean)
  const items: BreadcrumbItem[] = [{ label: 'Escritório' }]
  let currentPath = '/app'
  segments.forEach((seg, idx) => {
    currentPath += `/${seg}`
    const isLast = idx === segments.length - 1
    const formatted = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ')
    items.push({
      label: formatted,
      href: isLast ? undefined : currentPath,
    })
  })
  return items
}

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [customBreadcrumbs, setCustomBreadcrumbs] = useState<BreadcrumbItem[] | null>(null)

  // Reseta custom breadcrumbs sempre que a URL base mudar
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setCustomBreadcrumbs(null)
  }

  const breadcrumbs = useMemo(() => {
    if (customBreadcrumbs && customBreadcrumbs.length > 0) {
      return customBreadcrumbs
    }
    return getFallbackBreadcrumbs(pathname)
  }, [customBreadcrumbs, pathname])

  return (
    <BreadcrumbContext.Provider
      value={{
        customBreadcrumbs,
        setCustomBreadcrumbs,
        breadcrumbs,
      }}
    >
      {children}
    </BreadcrumbContext.Provider>
  )
}

export function useBreadcrumb() {
  const context = useContext(BreadcrumbContext)
  if (!context) {
    throw new Error('useBreadcrumb must be used within a BreadcrumbProvider')
  }
  return context
}

/**
 * Componente declarativo para definir breadcrumbs customizados em qualquer tela (Server ou Client Component).
 */
export function BreadcrumbSetter({ items }: { items: BreadcrumbItem[] }) {
  const { setCustomBreadcrumbs } = useBreadcrumb()
  const lastSerialized = useRef<string>('')

  const serialized = JSON.stringify(items)

  useEffect(() => {
    if (lastSerialized.current !== serialized) {
      lastSerialized.current = serialized
      setCustomBreadcrumbs(items)
    }
    return () => {
      setCustomBreadcrumbs(null)
    }
  }, [serialized, items, setCustomBreadcrumbs])

  return null
}
