'use server'

import { and, asc, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { setLogs, workoutSessions } from '@/db/schema'
import { requireUser } from '@/lib/session'

/** Verifica que la sesión sea del usuario logueado. */
async function ownSession(sessionId: number, userId: number) {
  const [session] = await db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)))
  if (!session) throw new Error('Esa sesión no es tuya.')
  return session
}

/** Deja las series de un ejercicio numeradas 1, 2, 3… sin huecos. */
async function renumber(sessionId: number, exerciseId: number) {
  const rows = await db
    .select({ id: setLogs.id })
    .from(setLogs)
    .where(and(eq(setLogs.sessionId, sessionId), eq(setLogs.exerciseId, exerciseId)))
    .orderBy(asc(setLogs.setNumber), asc(setLogs.id))

  for (const [index, row] of rows.entries()) {
    await db
      .update(setLogs)
      .set({ setNumber: index + 1 })
      .where(eq(setLogs.id, row.id))
  }
}

/**
 * Guarda todo lo que hay escrito en el formulario —día, cornaldo, nota y cada
 * serie— y devuelve el id de la sesión. Todas las acciones de la página pasan
 * por acá primero, así agregar o borrar una serie no se lleva puesto lo demás.
 */
async function applyEdits(formData: FormData, userId: number) {
  const sessionId = Number(formData.get('sessionId'))
  const session = await ownSession(sessionId, userId)

  const day = String(formData.get('day') ?? '')
  const cornaldo = Number(formData.get('cornaldo'))
  const note = String(formData.get('note') ?? '').trim()

  await db
    .update(workoutSessions)
    .set({
      day: /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : session.day,
      cornaldo: cornaldo >= 1 && cornaldo <= 5 ? cornaldo : null,
      note: note || null,
    })
    .where(eq(workoutSessions.id, sessionId))

  const logs = await db
    .select({ id: setLogs.id })
    .from(setLogs)
    .where(eq(setLogs.sessionId, sessionId))

  for (const log of logs) {
    const reps = Number(formData.get(`reps-${log.id}`))
    if (!Number.isFinite(reps) || reps <= 0) continue

    const raw = String(formData.get(`kg-${log.id}`) ?? '').replace(',', '.')
    const weight = raw === '' ? null : Number(raw)

    await db
      .update(setLogs)
      .set({ reps, weightKg: weight !== null && Number.isFinite(weight) ? weight : null })
      .where(eq(setLogs.id, log.id))
  }

  return sessionId
}

function refresh(sessionId: number) {
  revalidatePath(`/historial/${sessionId}`)
  revalidatePath('/historial')
  revalidatePath('/')
}

export async function saveSession(formData: FormData) {
  const { id: userId } = await requireUser()
  const sessionId = await applyEdits(formData, userId)
  refresh(sessionId)
  redirect('/historial')
}

/** Repite la última serie del ejercicio, para después corregirle los números. */
export async function addSetLog(exerciseId: number, formData: FormData) {
  const { id: userId } = await requireUser()
  const sessionId = await applyEdits(formData, userId)

  const [last] = await db
    .select({ setNumber: setLogs.setNumber, reps: setLogs.reps, weightKg: setLogs.weightKg })
    .from(setLogs)
    .where(and(eq(setLogs.sessionId, sessionId), eq(setLogs.exerciseId, exerciseId)))
    .orderBy(sql`${setLogs.setNumber} desc`)
    .limit(1)

  await db.insert(setLogs).values({
    sessionId,
    exerciseId,
    setNumber: (last?.setNumber ?? 0) + 1,
    reps: last?.reps ?? 10,
    weightKg: last?.weightKg ?? null,
  })

  refresh(sessionId)
}

/** Suma un ejercicio que quedó sin anotar, con su primera serie. */
export async function addExerciseToPastSession(formData: FormData) {
  const { id: userId } = await requireUser()
  const sessionId = await applyEdits(formData, userId)
  const exerciseId = Number(formData.get('nuevoEjercicio'))
  if (!Number.isFinite(exerciseId)) return

  const [{ last }] = await db
    .select({ last: sql<number>`coalesce(max(${setLogs.setNumber}), 0)` })
    .from(setLogs)
    .where(and(eq(setLogs.sessionId, sessionId), eq(setLogs.exerciseId, exerciseId)))

  await db.insert(setLogs).values({
    sessionId,
    exerciseId,
    setNumber: Number(last) + 1,
    reps: 10,
    weightKg: null,
  })

  refresh(sessionId)
}

export async function deleteSetLog(logId: number, formData: FormData) {
  const { id: userId } = await requireUser()
  const sessionId = await applyEdits(formData, userId)

  const [log] = await db
    .select({ exerciseId: setLogs.exerciseId })
    .from(setLogs)
    .where(and(eq(setLogs.id, logId), eq(setLogs.sessionId, sessionId)))
  if (!log) return

  await db.delete(setLogs).where(eq(setLogs.id, logId))
  await renumber(sessionId, log.exerciseId)

  refresh(sessionId)
}

export async function deleteSession(formData: FormData) {
  const { id: userId } = await requireUser()
  const sessionId = Number(formData.get('sessionId'))
  await ownSession(sessionId, userId)

  await db.delete(workoutSessions).where(eq(workoutSessions.id, sessionId))

  refresh(sessionId)
  redirect('/historial')
}
