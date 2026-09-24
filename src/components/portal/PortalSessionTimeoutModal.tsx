'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ShieldAlert, Clock, Loader2, LogOut, CheckCircle2 } from 'lucide-react'

interface PortalSessionTimeoutModalProps {
  /** Timestamp em ms no qual a sessão expira */
  sessionExpiresAt?: number
  /** Minutos de aviso antes de expirar (padrão: 5 min) */
  warningThresholdMinutes?: number
  /** Callback para estender a sessão */
  onExtendSession: () => Promise<{ success: boolean; newExpiresAt?: number }>
  /** Callback para deslogar */
  onLogout: () => Promise<void> | void
}

export default function PortalSessionTimeoutModal({
  sessionExpiresAt,
  warningThresholdMinutes = 5,
  onExtendSession,
  onLogout,
}: PortalSessionTimeoutModalProps) {
  // Inicializa a expiração baseada no prop ou cria fallback de 30 min a partir do carregamento
  const [expiresAt, setExpiresAt] = useState<number>(() => {
    return sessionExpiresAt || Date.now() + 30 * 60 * 1000
  })

  // Sincroniza se o prop mudar externamente
  useEffect(() => {
    if (sessionExpiresAt) {
      setExpiresAt(sessionExpiresAt)
    }
  }, [sessionExpiresAt])

  const [timeLeftMs, setTimeLeftMs] = useState<number>(() => Math.max(0, expiresAt - Date.now()))
  const [isExtending, setIsExtending] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [extendedSuccess, setExtendedSuccess] = useState(false)
  const hasLoggedOutRef = useRef(false)

  const warningThresholdMs = warningThresholdMinutes * 60 * 1000
  const isWarningVisible = timeLeftMs > 0 && timeLeftMs <= warningThresholdMs

  const handleAutoLogout = useCallback(async () => {
    if (hasLoggedOutRef.current) return
    hasLoggedOutRef.current = true
    setIsLoggingOut(true)
    try {
      await onLogout()
    } catch (e) {
      console.error('Erro no logout automático:', e)
    }
  }, [onLogout])

  // Timer de contagem a cada 1 segundo
  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, expiresAt - Date.now())
      setTimeLeftMs(remaining)

      if (remaining <= 0 && !hasLoggedOutRef.current) {
        clearInterval(timer)
        handleAutoLogout()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [expiresAt, handleAutoLogout])

  const handleExtend = async () => {
    setIsExtending(true)
    setExtendedSuccess(false)
    try {
      const res = await onExtendSession()
      if (res.success && res.newExpiresAt) {
        setExpiresAt(res.newExpiresAt)
        setTimeLeftMs(Math.max(0, res.newExpiresAt - Date.now()))
        setExtendedSuccess(true)
        setTimeout(() => {
          setExtendedSuccess(false)
        }, 2000)
      } else {
        // Se falhou (ex: código foi alterado), desloga
        handleAutoLogout()
      }
    } catch (err) {
      console.error('Erro ao estender sessão:', err)
      handleAutoLogout()
    } finally {
      setIsExtending(false)
    }
  }

  const handleManualLogout = async () => {
    setIsLoggingOut(true)
    hasLoggedOutRef.current = true
    await onLogout()
  }

  // Não renderiza nada se ainda não estiver dentro da janela de aviso
  if (!isWarningVisible && !extendedSuccess) {
    return null
  }

  // Formata MM:SS
  const totalSeconds = Math.max(0, Math.floor(timeLeftMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const formattedCountdown = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-timeout-title"
        className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 text-center space-y-5 animate-in zoom-in-95 duration-200"
      >
        {/* Ícone de Alerta */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shadow-xs">
          <Clock className="w-7 h-7 animate-pulse" />
        </div>

        {/* Título e Texto */}
        <div className="space-y-2">
          <h2 id="session-timeout-title" className="text-lg font-bold text-slate-900">
            Sua sessão vai expirar em breve
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
            Por motivos de segurança e sigilo de dados, o portal será desconectado automaticamente se você não confirmar continuidade.
          </p>
        </div>

        {/* Badge do Cronômetro Regressivo */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-amber-50/80 border border-amber-300/80 shadow-xs">
          <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
            Tempo Restante:
          </span>
          <span className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-amber-900">
            {formattedCountdown}
          </span>
        </div>

        {extendedSuccess && (
          <div className="flex items-center justify-center gap-2 p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Sessão estendida por mais 30 minutos com sucesso!</span>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={handleManualLogout}
            disabled={isLoggingOut || isExtending}
            className="w-full sm:w-1/3 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isLoggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            <span>Sair agora</span>
          </button>

          <button
            type="button"
            onClick={handleExtend}
            disabled={isExtending || isLoggingOut}
            className="w-full sm:w-2/3 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isExtending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Estendendo...</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4" />
                <span>Continuar conectado (+30 min)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
