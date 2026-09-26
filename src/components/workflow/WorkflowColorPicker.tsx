'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Check, Pipette, Palette, Sparkles, SlidersHorizontal, RefreshCw } from 'lucide-react'
import {
  WorkflowStageColor,
  StandardStageColor,
  STAGE_COLOR_CONFIG,
  getStageStyle,
  getBadgeInlineStyle,
  getDotInlineStyle,
  hexToRgb,
} from '@/lib/workflow-stages'

export interface WorkflowColorPickerProps {
  selectedColor: WorkflowStageColor
  onChange: (color: WorkflowStageColor) => void
  stageName?: string
  compact?: boolean
}

export const STANDARD_COLORS: StandardStageColor[] = [
  'slate',
  'blue',
  'indigo',
  'cyan',
  'emerald',
  'amber',
  'orange',
  'rose',
  'purple',
  'pink',
]

// Paleta curated de inspiração rápida em tons modernos
const POPULAR_HEX_PRESETS = [
  { name: 'Turquesa', hex: '#06B6D4' },
  { name: 'Teal Oceano', hex: '#0D9488' },
  { name: 'Esmeralda', hex: '#10B981' },
  { name: 'Azul Elétrico', hex: '#2563EB' },
  { name: 'Índigo Royal', hex: '#4F46E5' },
  { name: 'Violeta', hex: '#8B5CF6' },
  { name: 'Púrpura', hex: '#A855F7' },
  { name: 'Fúcsia', hex: '#D946EF' },
  { name: 'Rosa Carmim', hex: '#F43F5E' },
  { name: 'Coral / Laranja', hex: '#F97316' },
  { name: 'Âmbar Dourado', hex: '#F59E0B' },
  { name: 'Chumbo / Grafite', hex: '#475569' },
]

export default function WorkflowColorPicker({
  selectedColor,
  onChange,
  stageName = 'Etapa',
  compact = false,
}: WorkflowColorPickerProps) {
  const colorInputRef = useRef<HTMLInputElement | null>(null)

  // Determina se a cor atual é customizada (hex)
  const isCustomColor = !STANDARD_COLORS.includes(selectedColor as StandardStageColor)

  // Hex atual
  const currentHex = useMemo(() => {
    if (isCustomColor) {
      return selectedColor.startsWith('#') ? selectedColor : `#${selectedColor}`
    }
    return STAGE_COLOR_CONFIG[selectedColor as StandardStageColor]?.previewHex || '#3B82F6'
  }, [selectedColor, isCustomColor])

  const [hexInputText, setHexInputText] = useState(currentHex.toUpperCase())
  const [showRgbPanel, setShowRgbPanel] = useState(isCustomColor)

  useEffect(() => {
    setHexInputText(currentHex.toUpperCase())
    if (isCustomColor) {
      setShowRgbPanel(true)
    }
  }, [currentHex, isCustomColor])

  // RGB Atual
  const rgbValues = useMemo(() => {
    return hexToRgb(currentHex) || { r: 59, g: 130, b: 246 }
  }, [currentHex])

  const handleSelectStandard = (c: StandardStageColor) => {
    onChange(c)
  }

  const handleCustomHexChange = (newHex: string) => {
    let clean = newHex.trim()
    if (!clean.startsWith('#')) {
      clean = `#${clean}`
    }
    setHexInputText(clean.toUpperCase())

    // Se for um hex válido (3 ou 6 dígitos além do #)
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(clean)) {
      onChange(clean.toLowerCase())
    }
  }

  const handleNativeColorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase()
    setHexInputText(val.toUpperCase())
    onChange(val)
  }

  const handleRgbSliderChange = (channel: 'r' | 'g' | 'b', val: number) => {
    const nextRgb = { ...rgbValues, [channel]: Math.max(0, Math.min(255, val)) }
    const rHex = nextRgb.r.toString(16).padStart(2, '0')
    const gHex = nextRgb.g.toString(16).padStart(2, '0')
    const bHex = nextRgb.b.toString(16).padStart(2, '0')
    const newHex = `#${rHex}${gHex}${bHex}`.toLowerCase()
    setHexInputText(newHex.toUpperCase())
    onChange(newHex)
  }

  const stageStyle = getStageStyle(selectedColor)

  const buttonSize = compact ? 'w-5 h-5 rounded-lg' : 'w-7 h-7 rounded-xl'
  const checkSize = compact ? 'w-3 h-3' : 'w-3.5 h-3.5'

  return (
    <div className={`antialiased ${compact ? 'space-y-2' : 'space-y-3'}`}>
      {/* Grade de Cores Pré-definidas + Botão de Cor Customizada (Gradiente) */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        {STANDARD_COLORS.map((c) => {
          const cfg = STAGE_COLOR_CONFIG[c]
          const isSelected = selectedColor === c
          return (
            <button
              key={c}
              type="button"
              onClick={() => handleSelectStandard(c)}
              title={cfg.name}
              className={`${buttonSize} flex items-center justify-center transition-all cursor-pointer ${
                isSelected
                  ? 'ring-2 ring-offset-1 ring-blue-600 scale-110 shadow-xs'
                  : 'opacity-85 hover:opacity-100 hover:scale-105'
              }`}
              style={{ backgroundColor: cfg.previewHex }}
            >
              {isSelected && <Check className={`${checkSize} text-white stroke-[3]`} />}
            </button>
          )
        })}

        {/* Botão de Cor Personalizada (Gradiente / RGB) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowRgbPanel(true)
              colorInputRef.current?.click()
            }}
            title="Escolher Cor Personalizada no Gradiente / RGB"
            className={`${buttonSize} flex items-center justify-center transition-all cursor-pointer relative overflow-hidden group ${
              isCustomColor
                ? 'ring-2 ring-offset-1 ring-blue-600 scale-110 shadow-xs'
                : 'hover:scale-105 opacity-90 hover:opacity-100'
            }`}
            style={{
              background: isCustomColor
                ? currentHex
                : 'conic-gradient(from 180deg at 50% 50%, #EF4444, #F59E0B, #10B981, #06B6D4, #3B82F6, #8B5CF6, #EC4899, #EF4444)',
            }}
          >
            {isCustomColor ? (
              <Check className={`${checkSize} text-white stroke-[3] drop-shadow-xs`} />
            ) : (
              <Palette className={`${checkSize} text-white drop-shadow-sm`} />
            )}
          </button>

          {/* Input nativo invisível acionado ao clicar */}
          <input
            ref={colorInputRef}
            type="color"
            value={currentHex.length === 7 ? currentHex : '#3B82F6'}
            onChange={handleNativeColorInput}
            className="sr-only"
            tabIndex={-1}
          />
        </div>

        {/* Botão de Toggle do Painel RGB caso recolhido */}
        <button
          type="button"
          onClick={() => setShowRgbPanel((prev) => !prev)}
          className={`text-[11px] font-semibold ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'} rounded-lg border flex items-center gap-1 transition-all cursor-pointer ${
            showRgbPanel
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
          title="Abrir painel detalhado de cor RGB e Gradiente"
        >
          <SlidersHorizontal className="w-3 h-3" />
          <span>{showRgbPanel ? (compact ? 'Fechar' : 'Recolher RGB') : (compact ? 'RGB' : 'Painel RGB')}</span>
        </button>
      </div>

      {/* Painel Completo de Cor Personalizada / RGB / Gradiente */}
      {showRgbPanel && (
        <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/90 shadow-2xs space-y-3 animate-in fade-in zoom-in-95">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200/70">
            <div className="flex items-center gap-2">
              <span
                className="w-5 h-5 rounded-lg border border-slate-300 shadow-2xs shrink-0"
                style={{ backgroundColor: currentHex }}
              />
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Seletor de Cor RGB & Gradiente
              </span>
            </div>

            {/* Botão para invocar o gradiente 2D com o mouse */}
            <button
              type="button"
              onClick={() => colorInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 text-xs font-bold shadow-2xs transition-all cursor-pointer"
            >
              <Pipette className="w-3.5 h-3.5 text-blue-600" />
              <span>Abrir Gradiente Completo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            {/* Campo de Código Hexadecimal */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Código Hexadecimal (#RGB / #RRGGBB)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={hexInputText}
                  onChange={(e) => handleCustomHexChange(e.target.value)}
                  placeholder="#3B82F6"
                  maxLength={7}
                  className="w-full text-xs font-mono font-bold tracking-wider px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            {/* Sliders RGB Interativos */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500">
                <span className="text-red-600">R: {rgbValues.r}</span>
                <span className="text-emerald-600">G: {rgbValues.g}</span>
                <span className="text-blue-600">B: {rgbValues.b}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={rgbValues.r}
                  onChange={(e) => handleRgbSliderChange('r', parseInt(e.target.value))}
                  className="accent-red-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  title={`Vermelho: ${rgbValues.r}`}
                />
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={rgbValues.g}
                  onChange={(e) => handleRgbSliderChange('g', parseInt(e.target.value))}
                  className="accent-emerald-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  title={`Verde: ${rgbValues.g}`}
                />
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={rgbValues.b}
                  onChange={(e) => handleRgbSliderChange('b', parseInt(e.target.value))}
                  className="accent-blue-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  title={`Azul: ${rgbValues.b}`}
                />
              </div>
            </div>
          </div>

          {/* Paleta Rápida de Tons Modernos */}
          <div className="pt-1">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Sugestões de Tonalidades:
            </span>
            <div className="flex flex-wrap gap-1">
              {POPULAR_HEX_PRESETS.map((p) => {
                const isPresetSel = currentHex.toLowerCase() === p.hex.toLowerCase()
                return (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => handleCustomHexChange(p.hex)}
                    title={p.name}
                    className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                      isPresetSel
                        ? 'ring-2 ring-offset-1 ring-blue-600 scale-110 shadow-2xs'
                        : 'opacity-80 hover:opacity-100 hover:scale-105'
                    }`}
                    style={{ backgroundColor: p.hex }}
                  >
                    {isPresetSel && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Pré-visualização da Badge e Dot */}
          <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 font-semibold">
              Como aparecerá no Kanban e Gantt:
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${stageStyle.badge}`}
              style={getBadgeInlineStyle(stageStyle)}
            >
              <span
                className={`w-2 h-2 rounded-full ${stageStyle.dot}`}
                style={getDotInlineStyle(stageStyle)}
              />
              {stageName || 'Nova Etapa'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
