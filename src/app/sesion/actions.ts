'use server'

import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import {
  attendance,
  routineExercises,
  routines,
  sessionExercises,
  setLogs,
  workoutSessions,
} from '@/db/schema'
import { requireUser } from '@/lib/session'
import { openSessionId } from '@/lib/workout'
import { localHour, today } from '@/lib/week'

/** Resuelve un renglón de sesión verificando que sea del usuario logueado. */
async function ownRow(id: number, userId: number) {
  const [row] = await db
    .select({
      id: sessionExercises.id,
      sessionId: sessionExercises.sessionId,
      exerciseId: sessionExercises.exerciseId,
      position: sessionExercises.position,
      targetSets: sessionExercises.targetSets,
      targetReps: sessionExercises.targetReps,
      targetWeightKg: sessionExercises.targetWeightKg,
    })
    .from(sessionExercises)
    .innerJoin(workoutSessions, eq(workoutSessions.id, sessionExercises.sessionId))
    .where(and(eq(sessionExercises.id, id), eq(workoutSessions.userId, userId)))
  if (!row) throw new Error('Ese ejercicio no es de tu sesión.')
  return row
}

export async function startSession(formData: FormData) {
  const { id: userId } = await requireUser()
  const raw = String(formData.get('routineId') ?? 'libre')
  const day = today()

  if (await openSessionId(userId)) redirect('/sesion')

  let routineId: number | null = null
  if (raw !== 'libre') {
    const [routine] = await db
      .select({ id: routines.id })
      .from(routines)
      .where(and(eq(routines.id, Number(raw)), eq(routines.userId, userId)))
    routineId = routine?.id ?? null
  }

  const [session] = await db
    .insert(workoutSessions)
    .values({ userId, routineId, day })
    .returning({ id: workoutSessions.id })

  if (routineId) {
    const items = await db
      .select()
      .from(routineExercises)
      .where(eq(routineExercises.routineId, routineId))
      .orderBy(asc(routineExercises.position))

    if (items.length > 0) {
      await db.insert(sessionExercises).values(
        items.map((item, i) => ({
          sessionId: session.id,
          exerciseId: item.exerciseId,
          position: i,
          targetSets: item.targetSets,
          targetReps: item.targetReps,
          targetWeightKg: item.targetWeightKg,
        })),
      )
    }
  }

  // Arrancar una sesión también deja la marca en el calendario, a esta hora.
  await db
    .insert(attendance)
    .values({ userId, day, going: true, at: localHour(new Date()) })
    .onConflictDoUpdate({ target: [attendance.userId, attendance.day], set: { going: true } })

  revalidatePath('/')
  redirect('/sesion')
}

export async function logSet(formData: FormData) {
  const { id: userId } = await requireUser()
  const row = await ownRow(Number(formData.get('rowId')), userId)

  const reps = Number(formData.get('reps'))
  const rawWeight = String(formData.get('weight') ?? '').replace(',', '.')
  const weightKg = rawWeight === '' ? null : Number(rawWeight)

  if (!Number.isFinite(reps) || reps <= 0) return
  if (weightKg !== null && !Number.isFinite(weightKg)) return

  const [{ last }] = await db
    .select({ last: sql<number>`coalesce(max(${setLogs.setNumber}), 0)` })
    .from(setLogs)
    .where(and(eq(setLogs.sessionId, row.sessionId), eq(setLogs.exerciseId, row.exerciseId)))

  await db.insert(setLogs).values({
    sessionId: row.sessionId,
    exerciseId: row.exerciseId,
    setNumber: Number(last) + 1,
    reps,
    weightKg,
  })

  revalidatePath('/sesion')
}

export async function undoLastSet(rowId: number) {
  const { id: userId } = await requireUser()
  const row = await ownRow(rowId, userId)

  const [last] = await db
    .select({ id: setLogs.id })
    .from(setLogs)
    .where(and(eq(setLogs.sessionId, row.sessionId), eq(setLogs.exerciseId, row.exerciseId)))
    .orderBy(desc(setLogs.setNumber))
    .limit(1)

  if (last) await db.delete(setLogs).where(eq(setLogs.id, last.id))

  revalidatePath('/sesion')
}

/** Manda el ejercicio al final de la cola: la máquina está ocupada. */
export async function postpone(rowId: number) {
  const { id: userId } = await requireUser()
  const row = await ownRow(rowId, userId)

  await db
    .update(sessionExercises)
    .set({
      position: sql`(select coalesce(max(position), 0) + 1 from ${sessionExercises}
                     where session_id = ${row.sessionId})`,
    })
    .where(eq(sessionExercises.id, row.id))

  revalidatePath('/sesion')
}

/** Trae el ejercicio al frente de la cola: se liberó esa máquina. */
export async function bringForward(rowId: number) {
  const { id: userId } = await requireUser()
  const row = await ownRow(rowId, userId)

  await db
    .update(sessionExercises)
    .set({
      position: sql`(select coalesce(min(position), 0) - 1 from ${sessionExercises}
                     where session_id = ${row.sessionId})`,
    })
    .where(eq(sessionExercises.id, row.id))

  revalidatePath('/sesion')
}

export async function setRowStatus(rowId: number, status: 'pending' | 'done' | 'skipped') {
  const { id: userId } = await requireUser()
  const row = await ownRow(rowId, userId)

  await db.update(sessionExercises).set({ status }).where(eq(sessionExercises.id, row.id))
  revalidatePath('/sesion')
}

/**
 * Suma un ejercicio a la sesión en curso. Con `donde=ahora` entra al frente de
 * la cola; con cualquier otro valor, al final.
 */
export async function addExerciseToSession(formData: FormData) {
  const { id: userId } = await requireUser()
  const sessionId = await openSessionId(userId)
  const exerciseId = Number(formData.get('exerciseId'))
  if (!sessionId || !Number.isFinite(exerciseId)) return

  const first = String(formData.get('donde') ?? '') === 'ahora'
  const [{ edge }] = await db
    .select({
      edge: first
        ? sql<number>`coalesce(min(${sessionExercises.position}), 1) - 1`
        : sql<number>`coalesce(max(${sessionExercises.position}), -1) + 1`,
    })
    .from(sessionExercises)
    .where(eq(sessionExercises.sessionId, sessionId))

  await db.insert(sessionExercises).values({ sessionId, exerciseId, position: Number(edge) })

  revalidatePath('/sesion')
}

/**
 * Cambia un ejercicio por otro sin tocar la rutina: el objetivo y el lugar en
 * la cola son los mismos. Si el que sale ya tenía series anotadas queda cerrado
 * en su lugar, para no perderlas.
 */
export async function swapExercise(rowId: number, formData: FormData) {
  const { id: userId } = await requireUser()
  const row = await ownRow(rowId, userId)
  const exerciseId = Number(formData.get('exerciseId'))
  if (!Number.isFinite(exerciseId) || exerciseId === row.exerciseId) return

  const [{ logged }] = await db
    .select({ logged: sql<number>`count(*)` })
    .from(setLogs)
    .where(and(eq(setLogs.sessionId, row.sessionId), eq(setLogs.exerciseId, row.exerciseId)))

  if (Number(logged) > 0) {
    await db.update(sessionExercises).set({ status: 'done' }).where(eq(sessionExercises.id, row.id))
    await db.insert(sessionExercises).values({
      sessionId: row.sessionId,
      exerciseId,
      position: row.position,
      targetSets: row.targetSets,
      targetReps: row.targetReps,
      targetWeightKg: row.targetWeightKg,
    })
  } else {
    await db
      .update(sessionExercises)
      .set({ exerciseId })
      .where(eq(sessionExercises.id, row.id))
  }

  revalidatePath('/sesion')
}

export async function removeRow(rowId: number) {
  const { id: userId } = await requireUser()
  const row = await ownRow(rowId, userId)

  await db.delete(sessionExercises).where(eq(sessionExercises.id, row.id))
  revalidatePath('/sesion')
}

export async function finishSession(formData: FormData) {
  const { id: userId } = await requireUser()
  const sessionId = await openSessionId(userId)
  if (!sessionId) redirect('/')

  const cornaldo = Number(formData.get('cornaldo'))
  const note = String(formData.get('note') ?? '').trim()

  // Lo que quedó pendiente se cierra solo: hecho si llegó a tener series,
  // salteado si no. Así una sesión se termina de un botón.
  await db
    .update(sessionExercises)
    .set({
      status: sql`case when exists (
        select 1 from ${setLogs}
        where ${setLogs.sessionId} = ${sessionExercises.sessionId}
          and ${setLogs.exerciseId} = ${sessionExercises.exerciseId}
      ) then 'done' else 'skipped' end`,
    })
    .where(and(eq(sessionExercises.sessionId, sessionId), eq(sessionExercises.status, 'pending')))

  await db
    .update(workoutSessions)
    .set({
      endedAt: new Date(),
      cornaldo: cornaldo >= 1 && cornaldo <= 5 ? cornaldo : null,
      note: note || null,
    })
    .where(eq(workoutSessions.id, sessionId))

  revalidatePath('/')
  redirect('/')
}

/** Borra una sesión arrancada por error, con sus series. */
export async function discardSession() {
  const { id: userId } = await requireUser()
  const sessionId = await openSessionId(userId)
  if (sessionId) {
    await db.delete(workoutSessions).where(eq(workoutSessions.id, sessionId))
  }
  revalidatePath('/')
  redirect('/')
}
