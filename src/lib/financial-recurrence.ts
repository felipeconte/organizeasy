import { RecurrenceUnit, RecurrenceEndCondition } from '@/types/financial'

/**
 * Calcula a lista de datas YYYY-MM-DD para uma recorrência com base em intervalo, unidade e critério de término.
 * Esta função é pura e síncrona, podendo ser utilizada tanto no cliente (preview em tempo real) quanto no servidor.
 */
export function generateRecurrenceDates(options: {
  startDate: string // YYYY-MM-DD
  interval: number // 1 to 99
  unit: RecurrenceUnit // 'day' | 'week' | 'month' | 'year'
  weekDays?: number[] // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  endCondition: RecurrenceEndCondition // 'never' | 'date' | 'occurrences'
  endDate?: string | null
  occurrences?: number | null
  maxNeverOccurrences?: number
}): string[] {
  const {
    startDate,
    interval = 1,
    unit = 'month',
    weekDays = [],
    endCondition = 'never',
    endDate,
    occurrences,
    maxNeverOccurrences = 12
  } = options

  const safeInterval = Math.min(Math.max(1, Math.floor(interval) || 1), 99)
  const result: string[] = []

  const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
  const startObj = new Date(startYear, startMonth - 1, startDay)

  const targetOccurrences =
    endCondition === 'occurrences'
      ? Math.min(Math.max(1, occurrences || 1), 365)
      : endCondition === 'never'
        ? maxNeverOccurrences
        : 365 // Teto de segurança para 'date'

  if (unit === 'day') {
    let cur = new Date(startObj)
    while (result.length < targetOccurrences) {
      const y = cur.getFullYear()
      const m = String(cur.getMonth() + 1).padStart(2, '0')
      const d = String(cur.getDate()).padStart(2, '0')
      const dateStr = `${y}-${m}-${d}`

      if (endCondition === 'date' && endDate && dateStr > endDate) break

      result.push(dateStr)
      cur.setDate(cur.getDate() + safeInterval)
    }
  } else if (unit === 'week') {
    const activeWeekDays =
      weekDays && weekDays.length > 0
        ? Array.from(new Set(weekDays)).sort((a, b) => a - b)
        : [startObj.getDay()]

    let currentWeekStart = new Date(startObj)
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay())

    let iterations = 0
    while (result.length < targetOccurrences && iterations < 500) {
      iterations++
      for (const wd of activeWeekDays) {
        const candidate = new Date(currentWeekStart)
        candidate.setDate(currentWeekStart.getDate() + wd)

        const y = candidate.getFullYear()
        const m = String(candidate.getMonth() + 1).padStart(2, '0')
        const d = String(candidate.getDate()).padStart(2, '0')
        const dateStr = `${y}-${m}-${d}`

        if (dateStr < startDate) continue

        if (endCondition === 'date' && endDate && dateStr > endDate) {
          return result
        }

        if (!result.includes(dateStr)) {
          result.push(dateStr)
          if (result.length >= targetOccurrences) return result
        }
      }

      currentWeekStart.setDate(currentWeekStart.getDate() + safeInterval * 7)
    }
  } else if (unit === 'month') {
    let monthOffset = 0
    while (result.length < targetOccurrences && monthOffset < 1200) {
      const targetYear = startYear + Math.floor((startMonth - 1 + monthOffset) / 12)
      const targetMonth = ((startMonth - 1 + monthOffset) % 12) + 1
      const lastDayOfMonth = new Date(targetYear, targetMonth, 0).getDate()
      const dayToUse = Math.min(startDay, lastDayOfMonth)

      const y = targetYear
      const m = String(targetMonth).padStart(2, '0')
      const d = String(dayToUse).padStart(2, '0')
      const dateStr = `${y}-${m}-${d}`

      if (endCondition === 'date' && endDate && dateStr > endDate) break

      result.push(dateStr)
      monthOffset += safeInterval
    }
  } else if (unit === 'year') {
    let yearOffset = 0
    while (result.length < targetOccurrences && yearOffset < 100) {
      const targetYear = startYear + yearOffset
      const lastDayOfMonth = new Date(targetYear, startMonth, 0).getDate()
      const dayToUse = Math.min(startDay, lastDayOfMonth)

      const y = targetYear
      const m = String(startMonth).padStart(2, '0')
      const d = String(dayToUse).padStart(2, '0')
      const dateStr = `${y}-${m}-${d}`

      if (endCondition === 'date' && endDate && dateStr > endDate) break

      result.push(dateStr)
      yearOffset += safeInterval
    }
  }

  return result
}
