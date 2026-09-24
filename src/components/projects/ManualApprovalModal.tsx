'use client'

import React, { useState } from 'react'
import { ShieldCheck, AlertCircle, Loader2, X, MessageSquareQuote } from 'lucide-react'

interface ManualApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  taskTitle: string
  onConfirm: (justification: string) => Promise<void>
  isSubmitting?: boolean
}

export function ManualApprovalModal({
  isOpen,
  onClose,
  taskTitle,
  onConfirm,
  isSubmitting = false,
}: ManualApprovalModalProps) {
  const [justification, setJustification] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = justification.trim()
    if (!trimmed || trimmed.length < 5) {
      setError('Por favor, informe uma justificativa com no mínimo 5 caracteres.')
      return
    }

    setError(null)
    try {
      await onConfirm(trimmed)
      setJustification('')
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Falha ao processar aprovação manual.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold shadow-xs shrink-0">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-slate-900 leading-snug">
                  Aprovação Manual da Etapa
                </h4>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                  Supervisão
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-xs">{taskTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informative Alert */}
        <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200/80 text-xs text-blue-950 space-y-1">
          <p className="font-semibold text-blue-900 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
            Aprovação sem validação direta do cliente
          </p>
          <p className="text-blue-800/90 leading-relaxed">
            Seu usuário será registrado como o responsável por esta aprovação. A justificativa informada abaixo{' '}
            <strong className="font-bold underline">ficará visível para o cliente</strong> na página de acompanhamento do projeto.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Justification Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquareQuote className="w-4 h-4 text-slate-500" />
              Justificativa da Aprovação Manual *
            </label>
            <textarea
              rows={4}
              required
              autoFocus
              value={justification}
              onChange={(e) => {
                setJustification(e.target.value)
                if (error) setError(null)
              }}
              placeholder="Descreva o motivo desta aprovação (ex: Validação acordada e aprovada pelo cliente durante a reunião presencial de 24/09)..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-none leading-relaxed transition-all"
            />
            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span>Mínimo de 5 caracteres</span>
              <span className={justification.trim().length < 5 ? 'text-amber-600 font-semibold' : 'text-slate-500'}>
                {justification.trim().length} caracteres
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || justification.trim().length < 5}
              className="py-2.5 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md shadow-amber-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Registrando Aprovação...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" /> Confirmar Aprovação Manual
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
