const DAY_MS = 86_400_000

export const DAY_LABELS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']

/** Fecha local de Buenos Aires como 'YYYY-MM-DD', el formato de las columnas `date`. */
export function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(
    new Date(),
  )
}

/** Los 7 días de la semana que contiene `day`, de lunes a domingo. */
export function weekOf(day: string = today()): string[] {
  const date = new Date(`${day}T12:00:00Z`)
  const monday = new Date(date.getTime() - ((date.getUTCDay() + 6) % 7) * DAY_MS)
  return Array.from({ length: 7 }, (_, i) =>
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
  const fmt = (d: string, withMonth: boolean) =>
    new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      ...(withMonth ? { month: 'short' } : {}),
      timeZone: 'UTC',
    }).format(new Date(`${d}T12:00:00Z`))
  return `${fmt(days[0], days[0].slice(5, 7) !== days[6].slice(5, 7))} – ${fmt(days[6], true)}`
}
