'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { attendance } from '@/db/schema'
import { destroySession, requireUser } from '@/lib/session'

/** Normaliza una hora tipeada a 'HH:MM'. Cualquier cosa rara vuelve nula. */
function cleanTime(value: string | null): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec((value ?? '').trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return `${String(hours).padStart(2, '0')}:${match[2]}`
}

/** Anota la intención de ir ese día, con la hora si la eligió. */
export async function setAttendance(day: string, at: string | null, going: boolean) {
  const { id: userId } = await requireUser()
  const time = going ? cleanTime(at) : null

  await db
    .insert(attendance)
    .values({ userId, day, going, at: time })
    .onConflictDoUpdate({
      target: [attendance.userId, attendance.day],
      set: { going, at: time },
    })

  revalidatePath('/')
}

export async function logout() {
  await destroySession()
  redirect('/login')
}
