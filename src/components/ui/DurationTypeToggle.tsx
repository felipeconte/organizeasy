'use client'

import { Calendar, Briefcase, Info } from 'lucide-react'
import { DurationType } from '@/lib/date-utils'

export interface DurationTypeToggleProps {
  value?: DurationType | null
  onChange: (value: DurationType) => void
  size?: 'sm' | 'md'
  disabled?: boolean
  showExplanation?: boolean
  className?: string
}

export default function DurationTypeToggle({
  value = 'corridos',
  onChange,
  size = 'md',
  disabled = false,
  showExplanation = false,
  className = '',
}: DurationTypeToggleProps) {
  const currentVal: DurationType = value === 'uteis' ? 'uteis' : 'corridos'

  const isSmall = size === 'sm'

  return (
    <div className={`space-y-1 antialiased ${className}`}>
      <div className="inline-flex p-0.5 rounded-xl bg-slate-100/90 border border-slate-200/90 select-none">
        {/* Botão Dias Corridos */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('corridos')}
          className={`inline-flex items-center gap-1.5 rounded-lg font-bold transition-all cursor-pointer ${
            isSmall ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'
          } ${
            currentVal === 'corridos'
              ? 'bg-white text-slate-800 shadow-2xs border border-slate-200/70'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Conta todos os dias continuamente (padrão)"
        >
          <Calendar className={isSmall ? 'w-3 h-3 text-slate-500' : 'w-3.5 h-3.5 text-slate-600'} />
          <span>Dias Corridos</span>
        </button>

        {/* Botão Dias Úteis */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('uteis')}
          className={`inline-flex items-center gap-1.5 rounded-lg font-bold transition-all cursor-pointer ${
            isSmall ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'
          } ${
            currentVal === 'uteis'
              ? 'bg-amber-500 text-white shadow-2xs'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Desconsidera finais de semana e feriados nacionais"
        >
          <Briefcase className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          <span>Dias Úteis</span>
        </button>
      </div>

      {showExplanation && (
        <div className="flex items-center gap-1 text-[11px] font-medium transition-all">
          {currentVal === 'uteis' ? (
            <span className="text-amber-700 flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0 text-amber-600" />
              Desconsidera sábados, domingos e feriados nacionais do Brasil.
            </span>
          ) : (
            <span className="text-slate-400 flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0 text-slate-400" />
              Contagem contínua de dias corridos no calendário (padrão).
            </span>
          )}
        </div>
      )}
    </div>
  )
}
