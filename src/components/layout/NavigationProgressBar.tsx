'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * Utilitários para disparo imperativo da barra de progresso (ex: em router.push ou Server Actions)
 */
export function startNavigationProgress() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('organizeasy:start-progress'))
  }
}

export function stopNavigationProgress() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('organizeasy:stop-progress'))
  }
}

export function NavigationProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const [opacity, setOpacity] = useState(1)

  const timeoutsRef = useRef<NodeJS.Timeout[]>([])
  const isNavigatingRef = useRef(false)
  const startTimeRef = useRef<number>(0)

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((t) => clearTimeout(t))
    timeoutsRef.current = []
  }, [])

  const finishProgress = useCallback(() => {
    isNavigatingRef.current = false
    setProgress(100)

    // Aguarda a barra atingir 100% com o pill visível
    timeoutsRef.current.push(
      setTimeout(() => {
        setOpacity(0)
      }, 250)
    )

    // Esconde completamente e reseta
    timeoutsRef.current.push(
      setTimeout(() => {
        setVisible(false)
        setProgress(0)
        setOpacity(1)
      }, 550)
    )
  }, [])

  const completeProgress = useCallback(() => {
    clearAllTimeouts()

    // Garante um tempo mínimo de exibição de 600ms para nunca passar despercebido
    const elapsed = Date.now() - startTimeRef.current
    const minDisplayDuration = 600
    const remainingTime = Math.max(0, minDisplayDuration - elapsed)

    if (remainingTime > 0) {
      timeoutsRef.current.push(
        setTimeout(() => {
          finishProgress()
        }, remainingTime)
      )
    } else {
      finishProgress()
    }
  }, [clearAllTimeouts, finishProgress])

  const startProgress = useCallback(() => {
    clearAllTimeouts()
    isNavigatingRef.current = true
    startTimeRef.current = Date.now()

    setOpacity(1)
    setVisible(true)
    setProgress(28)

    // Incrementos graduais e perceptíveis
    timeoutsRef.current.push(
      setTimeout(() => {
        if (isNavigatingRef.current) setProgress(52)
      }, 200)
    )

    timeoutsRef.current.push(
      setTimeout(() => {
        if (isNavigatingRef.current) setProgress(74)
      }, 500)
    )

    timeoutsRef.current.push(
      setTimeout(() => {
        if (isNavigatingRef.current) setProgress(88)
      }, 1000)
    )

    timeoutsRef.current.push(
      setTimeout(() => {
        if (isNavigatingRef.current) setProgress(94)
      }, 1800)
    )

    // Timeout de segurança após 12 segundos
    timeoutsRef.current.push(
      setTimeout(() => {
        if (isNavigatingRef.current) {
          finishProgress()
        }
      }, 12000)
    )
  }, [clearAllTimeouts, finishProgress])

  // Conclui a barra quando a nova rota/parâmetros forem carregados
  useEffect(() => {
    if (visible) {
      completeProgress()
    }
  }, [pathname, searchParams, completeProgress, visible])

  // Captura cliques globais em links internos para disparo instantâneo
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Ignora cliques que não foram com o botão principal esquerdo
      if (e.button !== 0) return

      // Ignora atalhos de abertura em nova aba (Ctrl, Meta/Cmd, Shift, Alt)
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return

      const target = e.target as HTMLElement | null
      const anchor = target?.closest('a') as HTMLAnchorElement | null

      if (!anchor) return

      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download')) return

      const href = anchor.getAttribute('href')
      if (!href) return

      if (
        href.startsWith('#') ||
        href.startsWith('javascript:') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:')
      ) {
        return
      }

      try {
        const url = new URL(anchor.href, window.location.href)
        const currentUrl = new URL(window.location.href)

        if (url.origin !== currentUrl.origin) return

        // Se for para a mesma rota e mesmos query parameters, não reativa
        if (
          url.pathname === currentUrl.pathname &&
          url.search === currentUrl.search
        ) {
          return
        }

        startProgress()
      } catch {
        // URL inválida, ignora
      }
    }

    const handleCustomStart = () => startProgress()
    const handleCustomStop = () => completeProgress()

    document.addEventListener('click', handleDocumentClick, { capture: true })
    window.addEventListener('organizeasy:start-progress', handleCustomStart)
    window.addEventListener('organizeasy:stop-progress', handleCustomStop)

    return () => {
      document.removeEventListener('click', handleDocumentClick, { capture: true })
      window.removeEventListener('organizeasy:start-progress', handleCustomStart)
      window.removeEventListener('organizeasy:stop-progress', handleCustomStop)
      clearAllTimeouts()
    }
  }, [startProgress, completeProgress, clearAllTimeouts])

  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none transition-opacity duration-300 ease-out"
      style={{ opacity }}
    >
      {/* 1. Barra de progresso reforçada com 4px, gradiente azul e brilho neon */}
      <div className="fixed top-0 left-0 right-0 z-[99999] h-1 bg-blue-100/30 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-400 shadow-[0_0_12px_rgba(37,99,235,0.85),0_0_6px_rgba(59,130,246,0.7)] transition-all duration-300 ease-out"
          style={{
            width: `${progress}%`,
          }}
        />
      </div>

      {/* 2. Badge Flutuante "Carregando..." visível no canto superior direito */}
      <div className="fixed top-3.5 right-6 z-[99999] flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 border border-slate-200/90 shadow-lg shadow-blue-500/10 backdrop-blur-md text-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
        <span className="text-xs font-semibold tracking-tight text-slate-800">
          Carregando...
        </span>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
        </span>
      </div>
    </div>
  )
}
