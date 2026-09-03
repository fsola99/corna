'use server'

import { and, eq, gte } from 'drizzle-orm'
import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { attendance, weeklyPlans } from '@/db/schema'
import { destroySession, requireUser } from '@/lib/session'
import { closingSlot, slotOf, today, weekdayOf } from '@/lib/week'

/**
 * Un turno normalizado a dos horas 'HH:MM', o nulo. Tiene que entrar entero en
 * el día: no puede empezar antes de que abra ni terminar después de que cierre,
 * y el sábado cierra más temprano.
 */
function cleanTurn(
  weekday: number,
  startAt: string | null,
  endAt: string | null,
): [string, string] | null {
  const clean = (value: string | null): string | null => {
    const match = /^(\d{1,2}):(\d{2})$/.exec((value ?? '').trim())
    if (!match) return null
    const hours = Number(match[1])
    const minutes = Number(match[2])
    if (hours > 23 || minutes > 59) return null
    return `${String(hours).padStart(2, '0')}:${match[2]}`
  }

  const from = clean(startAt)
  const to = clean(endAt)
  if (from === null || to === null) return null

  const first = slotOf(from)
  const last = slotOf(to)
  if (first < 0 || last > closingSlot(weekday) || last <= first) return null

  return [from, to]
}

/** El turno que la semana tipo le pone a ese día, si le pone alguno. */
async function seriesTurn(userId: number, day: string) {
  const weekday = weekdayOf(day)
  if (weekday < 0) return null
  const [row] = await db
    .select({ startAt: weeklyPlans.startAt, endAt: weeklyPlans.endAt })
    .from(weeklyPlans)
    .where(and(eq(weeklyPlans.userId, userId), eq(weeklyPlans.weekday, weekday)))
  return row ?? null
}

/**
 * Deja anotado el turno de ese día, sólo ese día. Con las horas nulas se borra
 * la anotación, que es como se dice que ya no va.
 *
 * Cuando la semana tipo ya cubre ese día, esto no la toca: la pisa nada más
 * ahí. Marcar el mismo turno que la serie devuelve el día a la serie, en vez de
 * dejar una excepción que dice lo mismo.
 */
export async function setAttendance(day: string, startAt: string | null, endAt: string | null) {
  const { id: userId } = await requireUser()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return

  const turn = cleanTurn(weekdayOf(day), startAt, endAt)
  const planned = await seriesTurn(userId, day)

  const clear = () =>
    db.delete(attendance).where(and(eq(attendance.userId, userId), eq(attendance.day, day)))

  const sameAsSeries =
    turn !== null && planned !== null && planned.startAt === turn[0] && planned.endAt === turn[1]

  if ((turn === null && planned === null) || sameAsSeries) {
    await clear()
  } else {
    await db
      .insert(attendance)
      .values({
        userId,
        day,
        going: turn !== null,
        startAt: turn?.[0] ?? null,
        endAt: turn?.[1] ?? null,
      })
      .onConflictDoUpdate({
        target: [attendance.userId, attendance.day],
        set: { going: turn !== null, startAt: turn?.[0] ?? null, endAt: turn?.[1] ?? null },
      })
  }

  // La página lee la base directamente, así que alcanza con volver a pedirla.
  refresh()
}

/**
 * Fija el turno al que va todos los `weekday` —0 es lunes, 5 sábado—, en todas
 * las semanas. Con las horas nulas se levanta la serie.
 *
 * Levantarla también borra las cancelaciones futuras de ese día: sin serie que
 * cancelar, sólo taparían días libres.
 */
export async function setWeeklyPlan(
  weekday: number,
  startAt: string | null,
  endAt: string | null,
) {
  const { id: userId } = await requireUser()
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 5) return

  const turn = cleanTurn(weekday, startAt, endAt)

  if (turn === null) {
    await db
      .delete(weeklyPlans)
      .where(and(eq(weeklyPlans.userId, userId), eq(weeklyPlans.weekday, weekday)))

    const stale = await db
      .select({ day: attendance.day })
      .from(attendance)
      .where(
        and(
          eq(attendance.userId, userId),
          eq(attendance.going, false),
          gte(attendance.day, today()),
        ),
      )
    for (const row of stale) {
      if (weekdayOf(row.day) !== weekday) continue
      await db
        .delete(attendance)
        .where(and(eq(attendance.userId, userId), eq(attendance.day, row.day)))
    }
  } else {
    await db
      .insert(weeklyPlans)
      .values({ userId, weekday, startAt: turn[0], endAt: turn[1] })
      .onConflictDoUpdate({
        target: [weeklyPlans.userId, weeklyPlans.weekday],
        set: { startAt: turn[0], endAt: turn[1] },
      })
  }

  refresh()
}

export async function logout() {
  await destroySession()
  redirect('/login')
}
