import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { workoutSessions } from '@/db/schema'

/** El id de la sesión abierta del usuario, o null. Hay a lo sumo una. */
export async function openSessionId(userId: number): Promise<number | null> {
  const [row] = await db
    .select({ id: workoutSessions.id })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.userId, userId), isNull(workoutSessions.endedAt)))
    .orderBy(asc(workoutSessions.id))
    .limit(1)
  return row?.id ?? null
}
