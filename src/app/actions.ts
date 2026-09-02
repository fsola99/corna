'use server'

import { and, eq } from 'drizzle-orm'
import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { attendance } from '@/db/schema'
import { destroySession, requireUser } from '@/lib/session'

/** Normaliza una hora a 'HH:MM'. Cualquier cosa rara vuelve nula. */
function cleanTime(value: string | null): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec((value ?? '').trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return `${String(hours).padStart(2, '0')}:${match[2]}`
}

/**
 * Deja anotado que va ese día a esa hora. Con `at` nulo se borra la anotación,
 * que es como se dice que ya no va.
 */
export async function setAttendance(day: string, at: string | null) {
  const { id: userId } = await requireUser()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return

  const time = cleanTime(at)

  if (time === null) {
    await db.delete(attendance).where(and(eq(attendance.userId, userId), eq(attendance.day, day)))
  } else {
    await db
      .insert(attendance)
      .values({ userId, day, going: true, at: time })
      .onConflictDoUpdate({
        target: [attendance.userId, attendance.day],
        set: { going: true, at: time },
      })
  }

  // La página lee la base directamente, así que alcanza con volver a pedirla.
  refresh()
}

export async function logout() {
  await destroySession()
  redirect('/login')
}
