'use server'

import { and, asc, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { exercises, routineExercises, routines } from '@/db/schema'
import { requireUser } from '@/lib/session'

/** Verifica que la rutina sea del usuario logueado. */
async function ownRoutine(routineId: number, userId: number) {
  const [routine] = await db
    .select()
    .from(routines)
    .where(and(eq(routines.id, routineId), eq(routines.userId, userId)))
  if (!routine) throw new Error('Esa rutina no es tuya.')
  return routine
}

/** Verifica que el renglón pertenezca a una rutina del usuario. */
async function ownRow(rowId: number, userId: number) {
  const [row] = await db
    .select({ id: routineExercises.id, routineId: routineExercises.routineId })
    .from(routineExercises)
    .innerJoin(routines, eq(routines.id, routineExercises.routineId))
    .where(and(eq(routineExercises.id, rowId), eq(routines.userId, userId)))
  if (!row) throw new Error('Ese ejercicio no es de una rutina tuya.')
  return row
}

function num(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(String(value ?? '').replace(',', '.'))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export async function createRoutine(formData: FormData) {
  const { id: userId } = await requireUser()
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(routines)
    .where(eq(routines.userId, userId))

  const [routine] = await db
    .insert(routines)
    .values({ userId, name, isDefault: Number(count) === 0 })
    .returning({ id: routines.id })

  redirect(`/rutinas/${routine.id}`)
}

export async function renameRoutine(formData: FormData) {
  const { id: userId } = await requireUser()
  const routineId = Number(formData.get('routineId'))
  const name = String(formData.get('name') ?? '').trim()
  await ownRoutine(routineId, userId)
  if (!name) return

  await db.update(routines).set({ name }).where(eq(routines.id, routineId))
  revalidatePath(`/rutinas/${routineId}`)
  revalidatePath('/rutinas')
}

export async function makeDefault(formData: FormData) {
  const { id: userId } = await requireUser()
  const routineId = Number(formData.get('routineId'))
  await ownRoutine(routineId, userId)

  await db.update(routines).set({ isDefault: false }).where(eq(routines.userId, userId))
  await db.update(routines).set({ isDefault: true }).where(eq(routines.id, routineId))

  revalidatePath('/rutinas')
  revalidatePath('/')
}

export async function deleteRoutine(formData: FormData) {
  const { id: userId } = await requireUser()
  const routineId = Number(formData.get('routineId'))
  const routine = await ownRoutine(routineId, userId)

  await db.delete(routines).where(eq(routines.id, routineId))

  if (routine.isDefault) {
    const [next] = await db
      .select({ id: routines.id })
      .from(routines)
      .where(eq(routines.userId, userId))
      .orderBy(asc(routines.id))
      .limit(1)
    if (next) await db.update(routines).set({ isDefault: true }).where(eq(routines.id, next.id))
  }

  revalidatePath('/rutinas')
  redirect('/rutinas')
}

export async function addExercise(formData: FormData) {
  const { id: userId } = await requireUser()
  const routineId = Number(formData.get('routineId'))
  await ownRoutine(routineId, userId)

  const exerciseId = Number(formData.get('exerciseId'))
  if (!Number.isFinite(exerciseId)) return

  const [{ last }] = await db
    .select({ last: sql<number>`coalesce(max(${routineExercises.position}), -1)` })
    .from(routineExercises)
    .where(eq(routineExercises.routineId, routineId))

  await db
    .insert(routineExercises)
    .values({ routineId, exerciseId, position: Number(last) + 1 })

  revalidatePath(`/rutinas/${routineId}`)
}

/** Crea un ejercicio nuevo en el catálogo y lo suma a la rutina. */
export async function createExercise(formData: FormData) {
  const { id: userId } = await requireUser()
  const routineId = Number(formData.get('routineId'))
  await ownRoutine(routineId, userId)

  const name = String(formData.get('name') ?? '').trim()
  const zone = String(formData.get('zone') ?? 'Otros').trim()
  if (!name) return

  const [exercise] = await db
    .insert(exercises)
    .values({ name, zone, createdBy: userId })
    .onConflictDoUpdate({ target: exercises.name, set: { zone } })
    .returning({ id: exercises.id })

  const [{ last }] = await db
    .select({ last: sql<number>`coalesce(max(${routineExercises.position}), -1)` })
    .from(routineExercises)
    .where(eq(routineExercises.routineId, routineId))

  await db
    .insert(routineExercises)
    .values({ routineId, exerciseId: exercise.id, position: Number(last) + 1 })

  revalidatePath(`/rutinas/${routineId}`)
}

/** Guarda series, repeticiones y peso objetivo de todos los renglones de una vez. */
export async function saveTargets(formData: FormData) {
  const { id: userId } = await requireUser()
  const routineId = Number(formData.get('routineId'))
  await ownRoutine(routineId, userId)

  const rows = await db
    .select()
    .from(routineExercises)
    .where(eq(routineExercises.routineId, routineId))

  for (const row of rows) {
    const rawWeight = String(formData.get(`kg-${row.id}`) ?? '').replace(',', '.')
    const weight = rawWeight === '' ? null : Number(rawWeight)

    await db
      .update(routineExercises)
      .set({
        targetSets: num(formData.get(`sets-${row.id}`), row.targetSets),
        targetReps: num(formData.get(`reps-${row.id}`), row.targetReps),
        targetWeightKg: weight !== null && Number.isFinite(weight) ? weight : null,
      })
      .where(eq(routineExercises.id, row.id))
  }

  revalidatePath(`/rutinas/${routineId}`)
}

export async function removeRow(rowId: number) {
  const { id: userId } = await requireUser()
  const row = await ownRow(rowId, userId)

  await db.delete(routineExercises).where(eq(routineExercises.id, row.id))
  revalidatePath(`/rutinas/${row.routineId}`)
}

/** Intercambia el renglón con su vecino: `dir` es -1 para subir, 1 para bajar. */
export async function moveRow(rowId: number, dir: -1 | 1) {
  const { id: userId } = await requireUser()
  const row = await ownRow(rowId, userId)

  const rows = await db
    .select({ id: routineExercises.id, position: routineExercises.position })
    .from(routineExercises)
    .where(eq(routineExercises.routineId, row.routineId))
    .orderBy(asc(routineExercises.position), asc(routineExercises.id))

  const index = rows.findIndex((r) => r.id === row.id)
  const target = rows[index + dir]
  if (!target) return

  await db
    .update(routineExercises)
    .set({ position: target.position })
    .where(eq(routineExercises.id, row.id))
  await db
    .update(routineExercises)
    .set({ position: rows[index].position })
    .where(eq(routineExercises.id, target.id))

  revalidatePath(`/rutinas/${row.routineId}`)
}
