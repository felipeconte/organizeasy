'use client'

import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { animate, motion, motionValue, MotionValue, useReducedMotion, useTransform, HTMLMotionProps } from 'motion/react'
import { Play, Pause, Check, X } from 'lucide-react'

import './JellyRadio.css'

export interface JellyRadioItem {
  value: string
  label: React.ReactNode
  icon?: React.ReactNode
  disabled?: boolean
  activeColor?: string
  activeTextColor?: string
  chipColor?: string
  textColor?: string
  shadowColor?: string
  border?: string
  activeBorder?: string
}

export type JellyRadioItemInput = string | JellyRadioItem

export const PROJECT_STATUS_JELLY_ITEMS: JellyRadioItem[] = [
  {
    value: 'ativo',
    label: 'Ativo',
    icon: <Play className="w-3 h-3 fill-current" />,
    activeColor: '#10b981', // Emerald 500
    activeTextColor: '#ffffff',
    shadowColor: 'rgba(16, 185, 129, 0.35)',
    chipColor: '#f8fafc',
    textColor: '#475569',
    border: '#e2e8f0',
  },
  {
    value: 'pausado',
    label: 'Pausado',
    icon: <Pause className="w-3 h-3 fill-current" />,
    activeColor: '#f59e0b', // Amber 500
    activeTextColor: '#ffffff',
    shadowColor: 'rgba(245, 158, 11, 0.35)',
    chipColor: '#f8fafc',
    textColor: '#475569',
    border: '#e2e8f0',
  },
  {
    value: 'concluido',
    label: 'Concluído',
    icon: <Check className="w-3.5 h-3.5 stroke-[2.5]" />,
    activeColor: '#2563eb', // Blue 600
    activeTextColor: '#ffffff',
    shadowColor: 'rgba(37, 99, 235, 0.35)',
    chipColor: '#f8fafc',
    textColor: '#475569',
    border: '#e2e8f0',
  },
  {
    value: 'cancelado',
    label: 'Cancelado',
    icon: <X className="w-3.5 h-3.5 stroke-[2.5]" />,
    activeColor: '#ef4444', // Rose 500
    activeTextColor: '#ffffff',
    shadowColor: 'rgba(239, 68, 68, 0.35)',
    chipColor: '#f8fafc',
    textColor: '#475569',
    border: '#e2e8f0',
  },
]

export interface JellyRadioProps {
  items?: JellyRadioItemInput[]
  value?: string
  defaultValue?: string
  onChange?: (value: string, index: number) => void
  chipColor?: string
  activeColor?: string
  textColor?: string
  activeTextColor?: string
  size?: 'sm' | 'md' | 'lg'
  gap?: number
  radius?: number
  swell?: number
  barge?: number
  shrink?: number
  jelly?: number
  bounce?: number
  stagger?: number
  stiffness?: number
  disabled?: boolean
  ariaLabel?: string
  className?: string
}

const DEFAULT_ITEMS: JellyRadioItemInput[] = ['Off', 'Low', 'Medium', 'High', 'Max']
const SIZES: Record<'sm' | 'md' | 'lg', [number, number, number]> = {
  sm: [30, 12, 12],
  md: [36, 13, 16],
  lg: [44, 14, 20],
}

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

const spring = (k: number, m: number, bounce: number) => ({
  type: 'spring' as const,
  stiffness: k,
  damping: 2 * Math.sqrt(k * m) * (1 - bounce),
  mass: m,
})

interface ChipProps extends Omit<HTMLMotionProps<'button'>, 'children' | 'style'> {
  mv: { x: MotionValue<number>; sx: MotionValue<number>; sy: MotionValue<number> }
  children: React.ReactNode
  style?: React.CSSProperties
}

const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip({ mv, children, style, ...rest }, ref) {
  const transform = useTransform(
    [mv.x, mv.sx, mv.sy],
    ([x, sx, sy]) => `translateX(${x}px) scale(${sx}, ${sy})`
  )
  return (
    <motion.button ref={ref} style={{ transform, ...style }} {...rest}>
      {children}
    </motion.button>
  )
})

export default function JellyRadio({
  items = DEFAULT_ITEMS,
  value,
  defaultValue,
  onChange,
  chipColor = '#f8fafc',
  activeColor = '#2563eb',
  textColor = '#475569',
  activeTextColor = '#ffffff',
  size = 'md',
  gap = 6,
  radius = 12,
  swell = 0.15,
  barge = 4,
  shrink = 0.04,
  jelly = 0.8,
  bounce = 0.25,
  stagger = 20,
  stiffness = 580,
  disabled = false,
  ariaLabel = 'Options',
  className = '',
}: JellyRadioProps) {
  const list: JellyRadioItem[] = items.map((it) =>
    typeof it === 'string' ? { value: it, label: it } : it
  )
  const [inner, setInner] = useState(() => defaultValue ?? list[0]?.value)
  const current = value ?? inner
  const at = Math.max(
    0,
    list.findIndex((it) => it.value === current)
  )
  const reduce = useReducedMotion()
  const groupRef = useRef<HTMLDivElement | null>(null)
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([])
  const widths = useRef<number[]>([])
  const mvs = useRef<{ x: MotionValue<number>; sx: MotionValue<number>; sy: MotionValue<number> }[]>([])
  const applied = useRef(at)
  const cfg = useRef({
    swell,
    barge,
    shrink,
    jelly,
    bounce,
    stagger,
    stiffness,
    reduce,
    count: list.length,
  })
  cfg.current = { swell, barge, shrink, jelly, bounce, stagger, stiffness, reduce, count: list.length }
  const [h, font, px] = SIZES[size] ?? SIZES.md
  const itemsKey = list.map((it) => it.value).join('|')

  const mvFor = (i: number) => {
    let mv = mvs.current[i]
    if (!mv) {
      mv = { x: motionValue(0), sx: motionValue(1), sy: motionValue(1) }
      mvs.current[i] = mv
    }
    return mv
  }

  const apply = (sel: number, instant?: boolean) => {
    const C = cfg.current
    const group = groupRef.current
    const rtl = group ? getComputedStyle(group).direction === 'rtl' : false
    const push = ((widths.current[sel] ?? 0) * C.swell) / 2 + C.barge
    for (let i = 0; i < C.count; i++) {
      const mv = mvFor(i)
      const on = i === sel
      const far = Math.abs(i - sel)
      const dir = Math.sign(i - sel) * (rtl ? -1 : 1)
      const x = dir * push
      const s = on ? 1 + C.swell : 1 - C.shrink
      if (instant || C.reduce) {
        mv.x.jump(x)
        mv.sx.jump(s)
        mv.sy.jump(s)
        continue
      }
      const k = C.stiffness * (1 - 0.12 * Math.min(far, 3))
      const inFlight = mv.x.isAnimating() || mv.sx.isAnimating() || mv.sy.isAnimating()
      const delay = inFlight ? 0 : (far * C.stagger) / 1000
      animate(mv.x, x, { ...spring(k, 0.9, C.bounce), delay })
      const j = C.jelly
      animate(mv.sx, s, {
        ...spring(k * (1 + 0.24 * j), 0.9 - 0.1 * j, Math.min(0.85, C.bounce + 0.3 * j)),
        delay,
      })
      animate(mv.sy, s, { ...spring(k * (1 - 0.14 * j), 0.9 + 0.05 * j, C.bounce), delay: delay + 0.05 * j })
    }
  }

  const measure = () => {
    const group = groupRef.current
    if (!group) return
    widths.current = chipRefs.current.map((el) => el?.offsetWidth ?? 0)
    const chipH = chipRefs.current[0]?.offsetHeight ?? 0
    const maxW = Math.max(0, ...widths.current)
    group.style.setProperty('--jr-pad-x', `${Math.ceil((maxW * swell * 1.3) / 2 + barge) + 2}px`)
    group.style.setProperty('--jr-pad-y', `${Math.ceil((chipH * swell) / 2) + 2}px`)
  }

  useIsomorphicLayoutEffect(() => {
    const settle = () => {
      measure()
      apply(applied.current, true)
    }
    settle()
    const observer = new ResizeObserver(settle)
    if (groupRef.current) observer.observe(groupRef.current)
    if (typeof document !== 'undefined') {
      document.fonts?.ready?.then(settle)
    }
    return () => observer.disconnect()
  }, [itemsKey, size, gap, swell, barge, shrink])

  useEffect(() => {
    if (applied.current === at) return
    applied.current = at
    apply(at, true)
  }, [at])

  useEffect(
    () => () => {
      mvs.current.forEach((mv) => {
        mv.x.destroy()
        mv.sx.destroy()
        mv.sy.destroy()
      })
    },
    []
  )

  const commit = (i: number, instant?: boolean) => {
    if (disabled || i === at || !list[i] || list[i].disabled) return
    applied.current = i
    apply(i, instant)
    if (value === undefined) setInner(list[i].value)
    onChange?.(list[i].value, i)
  }

  const stepFrom = (i: number, dir: number) => {
    const n = list.length
    let j = i
    for (let tries = 0; tries < n; tries++) {
      j = (j + dir + n) % n
      if (!list[j].disabled) return j
    }
    return i
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    let next: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = stepFrom(i, 1)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = stepFrom(i, -1)
    else if (e.key === 'Home') next = stepFrom(-1, 1)
    else if (e.key === 'End') next = stepFrom(list.length, -1)
    else if (e.key === ' ' || e.key === 'Enter') next = i
    if (next === null) return
    e.preventDefault()
    commit(next, true)
    chipRefs.current[next]?.focus()
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={ariaLabel}
      data-disabled={disabled ? '' : undefined}
      className={`jelly-radio${className ? ` ${className}` : ''}`}
      style={
        {
          '--jr-chip': chipColor,
          '--jr-active': activeColor,
          '--jr-text': textColor,
          '--jr-active-text': activeTextColor,
          '--jr-gap': `${gap}px`,
          '--jr-radius': `${radius}px`,
          '--jr-h': `${h}px`,
          '--jr-font': `${font}px`,
          '--jr-px': `${px}px`,
        } as React.CSSProperties
      }
    >
      {list.map((it, i) => {
        const itemChipColor = it.chipColor || chipColor
        const itemActiveColor = it.activeColor || activeColor
        const itemTextColor = it.textColor || textColor
        const itemActiveTextColor = it.activeTextColor || activeTextColor
        const itemBorder = it.border || '#e2e8f0'
        const itemActiveBorder = it.activeBorder || 'transparent'
        const itemShadow = it.shadowColor || 'rgba(0, 0, 0, 0.12)'

        return (
          <Chip
            key={it.value}
            mv={mvFor(i)}
            ref={(el) => {
              chipRefs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={i === at}
            tabIndex={i === at ? 0 : -1}
            disabled={disabled || !!it.disabled}
            className="jelly-radio__chip"
            data-on={i === at ? 'true' : 'false'}
            style={
              {
                '--jr-chip': itemChipColor,
                '--jr-active': itemActiveColor,
                '--jr-text': itemTextColor,
                '--jr-active-text': itemActiveTextColor,
                '--jr-border': itemBorder,
                '--jr-active-border': itemActiveBorder,
                '--jr-shadow': itemShadow,
              } as React.CSSProperties
            }
            onClick={(e) => commit(i, e.detail === 0)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            <span className="jelly-radio__skin">
              {it.icon ? <span className="jelly-radio__icon">{it.icon}</span> : null}
              <span className="jelly-radio__label">{it.label}</span>
            </span>
          </Chip>
        )
      })}
    </div>
  )
}
