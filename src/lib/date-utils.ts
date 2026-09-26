/**
 * Utilitários para formatação e manipulação de datas no padrão brasileiro (DD/MM/AAAA).
 */

/**
 * Formata uma string de data (YYYY-MM-DD ou ISO) para o padrão brasileiro DD/MM/AAAA.
 * Evita problemas de deslocamento de fuso horário UTC em datas simples sem hora.
 */
export function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return ''

  try {
    // Se for string no formato YYYY-MM-DD (comum em inputs type="date" e colunas DATE do SQL)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-')
      return `${day}/${month}/${year}`
    }

    // Se começar com YYYY-MM-DD (ex: 2026-08-28T14:30:00.000Z)
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const [, year, month, day] = match
      return `${day}/${month}/${year}`
    }

    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr

    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return dateStr || ''
  }
}

/**
 * Formata timestamp ISO para "DD/MM/AAAA às HH:mm"
 */
export function formatDateTimeBR(dateStr?: string | null): string {
  if (!dateStr) return ''

  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr

    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')

    return `${day}/${month}/${year} às ${hours}:${minutes}`
  } catch {
    return dateStr || ''
  }
}

/**
 * Formata um intervalo de datas (start_date e due_date) para exibição amigável.
 * Ex: "28/08/2026 até 15/09/2026", "A partir de 28/08/2026", "Prazo: 15/09/2026", "Datas não definidas"
 */
export function formatDateRangeBR(startDate?: string | null, dueDate?: string | null): string {
  const formattedStart = formatDateBR(startDate)
  const formattedDue = formatDateBR(dueDate)

  if (formattedStart && formattedDue) {
    if (formattedStart === formattedDue) return formattedStart
    return `${formattedStart} até ${formattedDue}`
  }

  if (formattedStart && !formattedDue) {
    return `A partir de ${formattedStart}`
  }

  if (!formattedStart && formattedDue) {
    return `Prazo: ${formattedDue}`
  }

  return 'Datas não definidas'
}

/**
 * Converte com segurança uma string YYYY-MM-DD em um objeto Date local (à meia-noite).
 */
export function parseLocalDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null

  try {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const [, y, m, d] = match
      return new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0)
    }
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

/**
 * Formata dia e mês (DD/MM) para réguas do Gantt.
 */
export function formatDayMonthBR(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}

export const SHORT_MONTH_NAMES_BR = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
]

export const FULL_MONTH_NAMES_BR = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export const SHORT_WEEKDAY_NAMES_BR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function formatMonthYearBR(date: Date): string {
  const month = SHORT_MONTH_NAMES_BR[date.getMonth()]
  const year = date.getFullYear()
  return `${month}/${year}`
}

export function formatMonthFullYearBR(date: Date): string {
  const month = FULL_MONTH_NAMES_BR[date.getMonth()]
  const year = date.getFullYear()
  return `${month} de ${year}`
}

export function formatDayOfWeekShortBR(date: Date): string {
  return SHORT_WEEKDAY_NAMES_BR[date.getDay()]
}

export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export function startOfWeekBR(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0 = Dom, 1 = Seg, ...
  const diff = (day === 0 ? -6 : 1) - day // Ajusta para Segunda-feira
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfWeekBR(date: Date): Date {
  const s = startOfWeekBR(date)
  const e = new Date(s)
  e.setDate(e.getDate() + 6)
  e.setHours(23, 59, 59, 999)
  return e
}

export function startOfMonthBR(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
}

export function endOfMonthBR(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

export function startOfYearBR(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0)
}

export function endOfYearBR(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999)
}

export type DurationType = 'corridos' | 'uteis'

/**
 * Retorna a data do Domingo de Páscoa para um determinado ano utilizando o algoritmo Meeus/Jones/Butcher.
 */
export function getEasterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) // 3 = Março, 4 = Abril
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day, 0, 0, 0, 0)
}

/**
 * Retorna os feriados nacionais oficiais do Brasil para o ano especificado em formato YYYY-MM-DD.
 * Feriados fixos:
 * - 01/01: Confraternização Universal (Ano Novo)
 * - 21/04: Tiradentes
 * - 01/05: Dia Mundial do Trabalho
 * - 07/09: Independência do Brasil
 * - 12/10: Nossa Senhora Aparecida
 * - 02/11: Finados
 * - 15/11: Proclamação da República
 * - 20/11: Dia Nacional de Zumbi e da Consciência Negra (Lei nº 14.759/2023)
 * - 25/12: Natal
 *
 * Feriados móveis:
 * - Carnaval (terça-feira): Páscoa - 47 dias
 * - Sexta-feira Santa / Paixão de Cristo: Páscoa - 2 dias
 * - Corpus Christi: Páscoa + 60 dias
 */
export function getBrazilianHolidays(year: number, customHolidays?: string[]): Set<string> {
  const holidays = new Set<string>()

  const addDate = (m: number, d: number) => {
    const mm = String(m).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    holidays.add(`${year}-${mm}-${dd}`)
  }

  // Feriados Nacionais Fixos
  addDate(1, 1)   // Confraternização Universal
  addDate(4, 21)  // Tiradentes
  addDate(5, 1)   // Dia do Trabalho
  addDate(9, 7)   // Independência do Brasil
  addDate(10, 12) // Nossa Senhora Aparecida
  addDate(11, 2)  // Finados
  addDate(11, 15) // Proclamação da República
  addDate(11, 20) // Consciência Negra
  addDate(12, 25) // Natal

  // Feriados Nacionais Móveis baseados na Páscoa
  const easter = getEasterSunday(year)

  const addOffset = (days: number) => {
    const target = new Date(easter)
    target.setDate(target.getDate() + days)
    const y = target.getFullYear()
    const m = String(target.getMonth() + 1).padStart(2, '0')
    const d = String(target.getDate()).padStart(2, '0')
    holidays.add(`${y}-${m}-${d}`)
  }

  addOffset(-47) // Terça-feira de Carnaval
  addOffset(-2)  // Sexta-feira Santa
  addOffset(60)  // Corpus Christi

  // Feriados customizados adicionais (municipais/estaduais/escritório)
  if (customHolidays && Array.isArray(customHolidays)) {
    for (const h of customHolidays) {
      if (h) holidays.add(h)
    }
  }

  return holidays
}

// Cache em memória para feriados por ano
const holidaysCache = new Map<number, Set<string>>()

function getCachedHolidays(year: number, customHolidays?: string[]): Set<string> {
  if (customHolidays && customHolidays.length > 0) {
    return getBrazilianHolidays(year, customHolidays)
  }
  if (!holidaysCache.has(year)) {
    holidaysCache.set(year, getBrazilianHolidays(year))
  }
  return holidaysCache.get(year)!
}

/**
 * Retorna true se a data for um dia útil (não é sábado, nem domingo, nem feriado nacional).
 */
export function isBusinessDay(date: Date, customHolidays?: string[]): boolean {
  const dayOfWeek = date.getDay()
  // 0 = Domingo, 6 = Sábado
  if (dayOfWeek === 0 || dayOfWeek === 6) return false

  const year = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const dateKey = `${year}-${m}-${d}`

  const holidays = getCachedHolidays(year, customHolidays)
  return !holidays.has(dateKey)
}

/**
 * Se a data informada não for um dia útil (cair em sábado, domingo ou feriado),
 * avança sucessivamente dia a dia até encontrar o próximo dia útil.
 */
export function getNextBusinessDay(date: Date, customHolidays?: string[]): Date {
  const current = new Date(date)
  while (!isBusinessDay(current, customHolidays)) {
    current.setDate(current.getDate() + 1)
  }
  return current
}

/**
 * Calcula a data de término somando dias corridos ou úteis à data de início.
 * No modo "uteis":
 * - Se a data de início for em fim de semana ou feriado, inicia a contagem a partir do próximo dia útil.
 * - Desconsidera sábados, domingos e feriados nacionais brasileiros.
 * - Garante que o prazo final caia sempre em um dia útil.
 */
export function calculateDueDateFromDuration(
  startDateStr?: string | null,
  durationDays?: number | null,
  durationType: DurationType = 'corridos',
  customHolidays?: string[]
): string {
  if (!startDateStr || !durationDays || durationDays <= 0) return ''
  const start = parseLocalDate(startDateStr)
  if (!start) return ''

  if (durationType === 'uteis') {
    let current = getNextBusinessDay(start, customHolidays)
    let counted = 1

    while (counted < durationDays) {
      current.setDate(current.getDate() + 1)
      if (isBusinessDay(current, customHolidays)) {
        counted++
      }
    }

    const y = current.getFullYear()
    const m = String(current.getMonth() + 1).padStart(2, '0')
    const d = String(current.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Padrão: Dias Corridos
  const due = new Date(start)
  due.setDate(due.getDate() + (durationDays - 1))
  const y = due.getFullYear()
  const m = String(due.getMonth() + 1).padStart(2, '0')
  const d = String(due.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Calcula a duração entre startDate e dueDate.
 * No modo "corridos": quantidade de dias contínuos.
 * No modo "uteis": quantidade de dias úteis entre o início e o fim (inclusive).
 */
export function calculateDurationDays(
  startDateStr?: string | null,
  dueDateStr?: string | null,
  durationType: DurationType = 'corridos',
  customHolidays?: string[]
): number | null {
  if (!startDateStr || !dueDateStr) return null
  const start = parseLocalDate(startDateStr)
  const due = parseLocalDate(dueDateStr)
  if (!start || !due) return null

  if (start.getTime() > due.getTime()) return null

  if (durationType === 'uteis') {
    let count = 0
    const current = new Date(start)
    while (current.getTime() <= due.getTime()) {
      if (isBusinessDay(current, customHolidays)) {
        count++
      }
      current.setDate(current.getDate() + 1)
    }
    return count > 0 ? count : 1
  }

  const diffTime = due.getTime() - start.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1
  return diffDays > 0 ? diffDays : 1
}

export type TaskTimelineStatusType =
  | 'concluido'
  | 'extrapolou'
  | 'hoje'
  | 'amanha'
  | 'curto'
  | 'longo'
  | 'sem_datas'

export interface TaskTimelineStatusInfo {
  type: TaskTimelineStatusType
  label: string
  shortLabel: string
  daysLeft: number | null
  durationDays: number | null
  badgeColor: string
  badgeBg: string
  badgeBorder: string
  textColor: string
}

/**
 * Avalia o status do prazo/tempo da tarefa em tempo real.
 * Categorias: Concluído, Extrapolou (Atrasada), Vence Hoje, Vence Amanhã, Prazo Curto (<= 3 dias), Prazo Longo (> 3 dias), Sem Datas.
 */
export function getTaskTimelineStatus(
  startDateStr?: string | null,
  dueDateStr?: string | null,
  isCompleted?: boolean,
  durationType: DurationType = 'corridos'
): TaskTimelineStatusInfo {
  const dur = calculateDurationDays(startDateStr, dueDateStr, durationType)

  if (isCompleted) {
    return {
      type: 'concluido',
      label: 'Concluído',
      shortLabel: 'Concluído',
      daysLeft: 0,
      durationDays: dur,
      badgeColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-50',
      badgeBorder: 'border-emerald-200',
      textColor: 'text-emerald-700',
    }
  }

  if (!dueDateStr) {
    return {
      type: 'sem_datas',
      label: 'Sem Prazo Definido',
      shortLabel: 'Sem Prazo',
      daysLeft: null,
      durationDays: dur || (startDateStr ? 1 : null),
      badgeColor: 'text-slate-500',
      badgeBg: 'bg-slate-100',
      badgeBorder: 'border-slate-200',
      textColor: 'text-slate-500',
    }
  }

  const due = parseLocalDate(dueDateStr)
  if (!due) {
    return {
      type: 'sem_datas',
      label: 'Data Inválida',
      shortLabel: 'Inválido',
      daysLeft: null,
      durationDays: dur,
      badgeColor: 'text-slate-500',
      badgeBg: 'bg-slate-100',
      badgeBorder: 'border-slate-200',
      textColor: 'text-slate-500',
    }
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const diffTime = due.getTime() - today.getTime()
  const daysLeft = Math.round(diffTime / (1000 * 60 * 60 * 24))

  if (daysLeft < 0) {
    const daysOverdue = Math.abs(daysLeft)
    return {
      type: 'extrapolou',
      label: `Extrapolou (${daysOverdue} ${daysOverdue === 1 ? 'dia' : 'dias'} de atraso)`,
      shortLabel: `Atrasada (${daysOverdue}d)`,
      daysLeft,
      durationDays: dur,
      badgeColor: 'text-rose-700',
      badgeBg: 'bg-rose-50',
      badgeBorder: 'border-rose-200',
      textColor: 'text-rose-700',
    }
  }

  if (daysLeft === 0) {
    return {
      type: 'hoje',
      label: 'Em Cima do Prazo (Vence Hoje)',
      shortLabel: 'Vence Hoje',
      daysLeft: 0,
      durationDays: dur,
      badgeColor: 'text-amber-800',
      badgeBg: 'bg-amber-100/90',
      badgeBorder: 'border-amber-300',
      textColor: 'text-amber-800',
    }
  }

  if (daysLeft === 1) {
    return {
      type: 'amanha',
      label: 'Em Cima do Prazo (Vence Amanhã)',
      shortLabel: 'Vence Amanhã',
      daysLeft: 1,
      durationDays: dur,
      badgeColor: 'text-amber-800',
      badgeBg: 'bg-amber-50',
      badgeBorder: 'border-amber-200',
      textColor: 'text-amber-800',
    }
  }

  if (daysLeft <= 3) {
    return {
      type: 'curto',
      label: `Prazo Curto (Faltam ${daysLeft} dias)`,
      shortLabel: `Prazo Curto (${daysLeft}d)`,
      daysLeft,
      durationDays: dur,
      badgeColor: 'text-amber-700',
      badgeBg: 'bg-amber-50',
      badgeBorder: 'border-amber-200',
      textColor: 'text-amber-700',
    }
  }

  return {
    type: 'longo',
    label: `Prazo Longo (Faltam ${daysLeft} dias)`,
    shortLabel: `No Prazo (${daysLeft}d)`,
    daysLeft,
    durationDays: dur,
    badgeColor: 'text-blue-700',
    badgeBg: 'bg-blue-50',
    badgeBorder: 'border-blue-200',
    textColor: 'text-blue-700',
  }
}

