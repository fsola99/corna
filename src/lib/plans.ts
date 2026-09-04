import { weekdayOf } from './week'

/**
 * De dónde sale lo que muestra una casilla: de la semana tipo, de un turno
 * suelto de ese día, o de la semana tipo corrida de horario ese día.
 */
export type Source = 'once' | 'series' | 'moved'

/** El turno que una persona tiene ese día. Sin horario marcado las dos horas son nulas. */
export type Plan = {
  startAt: string | null
  endAt: string | null
  source: Source
}

/** Lo anotado en la semana, indexado por `${userId}:${day}`. */
export type Plans = Record<string, Plan>

/** La semana tipo de todo el grupo, indexada por `${userId}:${weekday}`. */
export type Series = Record<string, { startAt: string; endAt: string }>

export type SeriesRow = { userId: number; weekday: number; startAt: string; endAt: string }
export type ExceptionRow = {
  userId: number
  day: string
  going: boolean
  startAt: string | null
  endAt: string | null
}

export function seriesMap(rows: SeriesRow[]): Series {
  return Object.fromEntries(
    rows.map((row) => [`${row.userId}:${row.weekday}`, { startAt: row.startAt, endAt: row.endAt }]),
  )
}

/**
 * Lo que hay que mostrar en cada día de la semana, resuelto en el orden en que
 * manda cada cosa: la semana tipo pone el piso y el turno de ese día la pisa,
 * corriéndolo de horario o cancelándolo.
 */
export function resolveWeek({
  days,
  series,
  exceptions,
}: {
  days: string[]
  series: SeriesRow[]
  exceptions: ExceptionRow[]
}): Plans {
  const cells: Plans = {}
  const byWeekday = seriesMap(series)

  for (const day of days) {
    const weekday = weekdayOf(day)
    if (weekday < 0) continue
    for (const row of series) {
      if (row.weekday !== weekday) continue
      cells[`${row.userId}:${day}`] = {
        startAt: row.startAt,
        endAt: row.endAt,
        source: 'series',
      }
    }
  }

  for (const row of exceptions) {
    if (!days.includes(row.day)) continue
    const key = `${row.userId}:${row.day}`
    if (!row.going) {
      delete cells[key]
      continue
    }
    const planned = byWeekday[`${row.userId}:${weekdayOf(row.day)}`]
    const same = planned && planned.startAt === row.startAt && planned.endAt === row.endAt
    cells[key] = {
      startAt: row.startAt,
      endAt: row.endAt,
      source: !planned ? 'once' : same ? 'series' : 'moved',
    }
  }

  return cells
}
