'use server'

import { sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { attendance } from '@/db/schema'
import { destroySession, requireUser } from '@/lib/session'

/** Anota o desanota la intención de ir al gimnasio ese día. */
export async function toggleAttendance(day: string) {
  const { id: userId } = await requireUser()

  await db
    .insert(attendance)
    .values({ userId, day, going: true })
    .onConflictDoUpdate({
      target: [attendance.userId, attendance.day],
      set: { going: sql`not ${attendance.going}` },
    })

  revalidatePath('/')
}

export async function logout() {
  await destroySession()
  redirect('/login')
}
