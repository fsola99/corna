import { inArray } from 'drizzle-orm'
import { db } from './index'
import {
  attendance,
  exercises,
  routineExercises,
  routines,
  sessionExercises,
  setLogs,
  workoutSessions,
} from './schema'
import { weekOf } from '../lib/week'

/**
 * Carga una semana de ejemplo —intenciones con horario, rutinas y sesiones
 * cerradas— sobre los usuarios que ya existan. Es sólo para desarrollo: borra
 * las rutinas, sesiones y anotaciones de esos usuarios antes de escribir.
 */
async function main() {
  const days = weekOf()
  const people = await db.query.users.findMany({ orderBy: (u, { asc }) => asc(u.id) })
  if (people.length === 0) throw new Error('No hay usuarios: registrate primero desde la app.')

  const me = people[0]
  const other = people[1] ?? people[0]
  const ids = [...new Set([me.id, other.id])]

  await db.delete(routines).where(inArray(routines.userId, ids))
  await db.delete(workoutSessions).where(inArray(workoutSessions.userId, ids))
  await db.delete(attendance).where(inArray(attendance.userId, ids))

  const catalog = await db.select().from(exercises)
  const pick = (needle: string) => catalog.find((e) => e.name.toLowerCase().includes(needle))
  const plan = [
    { exercise: pick('banca'), sets: 4, reps: 8, kg: 70 },
    { exercise: pick('remo con barra'), sets: 4, reps: 10, kg: 55 },
    { exercise: pick('dominadas'), sets: 3, reps: 8, kg: null },
    { exercise: pick('militar'), sets: 3, reps: 10, kg: 35 },
    { exercise: pick('curl'), sets: 3, reps: 12, kg: 15 },
  ].flatMap((row) => (row.exercise ? [{ ...row, exercise: row.exercise }] : []))

  if (plan.length === 0) throw new Error('Catálogo vacío: corré npm run db:seed primero.')

  const [routine] = await db
    .insert(routines)
    .values({ userId: me.id, name: 'Torso pesado', isDefault: true })
    .returning()

  await db.insert(routineExercises).values(
    plan.map((row, i) => ({
      routineId: routine.id,
      exerciseId: row.exercise.id,
      position: i,
      targetSets: row.sets,
      targetReps: row.reps,
      targetWeightKg: row.kg,
    })),
  )

  // El miércoles los dos caen a la misma hora: eso es lo que hace la grilla.
  await db.insert(attendance).values([
    { userId: me.id, day: days[0], going: true, at: '19:30' },
    { userId: me.id, day: days[2], going: true, at: '19:30' },
    { userId: me.id, day: days[4], going: true, at: '18:00' },
    { userId: me.id, day: days[5], going: true, at: null },
    ...(other.id === me.id
      ? []
      : [
          { userId: other.id, day: days[1], going: true, at: '07:00' },
          { userId: other.id, day: days[2], going: true, at: '19:30' },
          { userId: other.id, day: days[3], going: true, at: '21:00' },
        ]),
  ])

  const past = [-21, -14, -7, 0].map((shift) => {
    const date = new Date(`${days[0]}T12:00:00Z`)
    date.setUTCDate(date.getUTCDate() + shift)
    return date.toISOString().slice(0, 10)
  })

  const scores = [3, 4, 2, 5]
  for (const [index, day] of past.entries()) {
    const [session] = await db
      .insert(workoutSessions)
      .values({
        userId: me.id,
        routineId: routine.id,
        day,
        startedAt: new Date(`${day}T22:30:00Z`),
        endedAt: new Date(`${day}T23:44:00Z`),
        cornaldo: scores[index],
        note: index === scores.length - 1 ? 'El banco estaba ocupado, hice mancuernas' : null,
      })
      .returning()

    await db.insert(sessionExercises).values(
      plan.map((row, i) => ({
        sessionId: session.id,
        exerciseId: row.exercise.id,
        position: i,
        targetSets: row.sets,
        targetReps: row.reps,
        targetWeightKg: row.kg,
        status: 'done',
      })),
    )

    await db.insert(setLogs).values(
      plan.flatMap((row) =>
        Array.from({ length: row.sets }, (_, set) => ({
          sessionId: session.id,
          exerciseId: row.exercise.id,
          setNumber: set + 1,
          reps: row.reps - (set > 1 ? 1 : 0),
          weightKg: row.kg === null ? null : row.kg + index * 2.5,
        })),
      ),
    )
  }

  console.log(`Demo: ${past.length} sesiones y una semana anotada para ${me.name}.`)
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error)
    process.exit(1)
  },
)
