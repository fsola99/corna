const DAY_MS = 86_400_000
const TZ = 'America/Argentina/Buenos_Aires'

/** El calendario va de lunes a sábado: el domingo el gimnasio no abre. */
export const DAY_LABELS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
export const LONG_DAY_LABELS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** Las franjas del calendario, de 07:00 a 22:00. */
export const HOURS = Array.from({ length: 16 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`)

/** Fecha local de Buenos Aires como 'YYYY-MM-DD', el formato de las columnas `date`. */
export function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
}

/** La hora local de Buenos Aires de un instante, redondeada hacia abajo, como 'HH:00'. */
export function localHour(when: Date): string {
  return `${new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(when)}:00`
}

/** La franja del calendario en la que cae una hora 'HH:MM', o nula si queda afuera. */
export function hourSlot(at: string | null): string | null {
  if (!at) return null
  const slot = `${at.slice(0, 2)}:00`
  return HOURS.includes(slot) ? slot : null
}

/** Los seis días —lunes a sábado— de la semana que contiene `day`. */
export function weekOf(day: string = today()): string[] {
  const date = new Date(`${day}T12:00:00Z`)
  const monday = new Date(date.getTime() - ((date.getUTCDay() + 6) % 7) * DAY_MS)
  return Array.from({ length: 6 }, (_, i) =>
    new Date(monday.getTime() + i * DAY_MS).toISOString().slice(0, 10),
  )
}

export function shiftWeek(day: string, weeks: number): string {
  return new Date(new Date(`${day}T12:00:00Z`).getTime() + weeks * 7 * DAY_MS)
    .toISOString()
    .slice(0, 10)
}

export function dayNumber(day: string): string {
  return day.slice(8, 10)
}

/** 'lun 31 ago' */
export function longDay(day: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${day}T12:00:00Z`))
}

export function weekLabel(days: string[]): string {
  const last = days[days.length - 1]
  const fmt = (d: string, withMonth: boolean) =>
    new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      ...(withMonth ? { month: 'short' } : {}),
      timeZone: 'UTC',
    }).format(new Date(`${d}T12:00:00Z`))
  return `${fmt(days[0], days[0].slice(5, 7) !== last.slice(5, 7))} – ${fmt(last, true)}`
}
