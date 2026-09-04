const DAY_MS = 86_400_000
const TZ = 'America/Argentina/Buenos_Aires'

/** El calendario va de lunes a sábado: el domingo el gimnasio no abre. */
export const DAY_LABELS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
export const LONG_DAY_LABELS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** Las franjas del calendario, de 07:00 a 22:00. */
export const HOURS = Array.from({ length: 16 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`)

/**
 * La grilla se mide en cuartos de hora: al costado siguen apareciendo sólo las
 * horas, pero un turno puede empezar y terminar en cualquier cuarto. Los
 * cuartos se numeran desde las 07:00 —el 0— hasta las 23:00, que es el `TOTAL`
 * y sólo vale como final.
 */
export const FIRST_HOUR = 7
export const SLOT_MINUTES = 15
export const SLOTS_PER_HOUR = 60 / SLOT_MINUTES
export const TOTAL_SLOTS = HOURS.length * SLOTS_PER_HOUR

/** En qué cuarto de la grilla cae 'HH:MM'. Puede dar afuera de la grilla. */
export function slotOf(at: string): number {
  const hours = Number(at.slice(0, 2))
  const minutes = Number(at.slice(3, 5))
  return (hours - FIRST_HOUR) * SLOTS_PER_HOUR + Math.floor(minutes / SLOT_MINUTES)
}

/** La hora 'HH:MM' en la que empieza un cuarto de la grilla. */
export function atOfSlot(slot: number): string {
  const minutes = FIRST_HOUR * 60 + slot * SLOT_MINUTES
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

/**
 * El cuarto en el que cierra el gimnasio ese día de la semana: el sábado a las
 * 18:00 y el resto a las 23:00. Es el final de la grilla de ese día, así que
 * vale como hora de salida pero no como hora de entrada.
 */
export function closingSlot(weekday: number): number {
  return weekday === 5 ? slotOf('18:00') : TOTAL_SLOTS
}

/** Fecha local de Buenos Aires como 'YYYY-MM-DD', el formato de las columnas `date`. */
export function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
}

/** La hora local de Buenos Aires de un instante, como 'HH:MM'. */
export function localTime(when: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(when)
}

/** El día de la semana de un 'YYYY-MM-DD': 0 es lunes y 5 sábado; el domingo da -1. */
export function weekdayOf(day: string): number {
  const index = (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7
  return index < 6 ? index : -1
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
