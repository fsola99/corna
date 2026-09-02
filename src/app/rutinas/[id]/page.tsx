import { and, asc, eq } from 'drizzle-orm'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExerciseSelect } from '@/components/exercise-select'
import { Header } from '@/components/header'
import { db } from '@/db'
import { exercises, routineExercises, routines } from '@/db/schema'
import { activeGroup } from '@/lib/groups'
import { requireUser } from '@/lib/session'
import {
  addExercise,
  createExercise,
  deleteRoutine,
  makeDefault,
  moveRow,
  removeRow,
  renameRoutine,
  saveTargets,
} from '../actions'

export default async function RoutineEditor({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser()
  const group = await activeGroup(me.id)
  const routineId = Number((await params).id)
  if (!Number.isFinite(routineId)) notFound()

  const [routine] = await db
    .select()
    .from(routines)
    .where(and(eq(routines.id, routineId), eq(routines.userId, me.id)))
  if (!routine) notFound()

  const [rows, catalog] = await Promise.all([
    db
      .select({
        id: routineExercises.id,
        name: exercises.name,
        zone: exercises.zone,
        targetSets: routineExercises.targetSets,
        targetReps: routineExercises.targetReps,
        targetWeightKg: routineExercises.targetWeightKg,
      })
      .from(routineExercises)
      .innerJoin(exercises, eq(exercises.id, routineExercises.exerciseId))
      .where(eq(routineExercises.routineId, routineId))
      .orderBy(asc(routineExercises.position), asc(routineExercises.id)),
    db.select().from(exercises).orderBy(asc(exercises.zone), asc(exercises.name)),
  ])

  const zones = [...new Set(catalog.map((e) => e.zone))]

  return (
    <>
      <Header user={me} group={group} active="rutinas" />

      <main className="mx-auto max-w-3xl px-4 pt-8 pb-16">
        <Link
          href="/rutinas"
          className="font-head text-sm font-bold tracking-[0.2em] uppercase underline decoration-teal decoration-2 underline-offset-4"
        >
          ← Todas tus rutinas
        </Link>

        <form action={renameRoutine} className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="routineId" value={routine.id} />
          <input
            name="name"
            defaultValue={routine.name}
            maxLength={40}
            aria-label="Nombre de la rutina"
            className="field font-head min-w-52 flex-1 py-1 text-left text-3xl leading-none font-black tracking-tight uppercase sm:text-5xl"
          />
          <button
            type="submit"
            className="ink-flat ink-press font-head px-3 py-1.5 text-sm font-black tracking-[0.2em] uppercase"
          >
            Renombrar
          </button>
          {!routine.isDefault && (
            <button
              type="submit"
              formAction={makeDefault}
              className="ink-flat ink-press bg-teal text-paper font-head px-3 py-1.5 text-sm font-black tracking-[0.2em] uppercase"
            >
              Usar por defecto
            </button>
          )}
        </form>

        <form action={saveTargets} className="mt-8">
          <input type="hidden" name="routineId" value={routine.id} />

          {rows.length === 0 ? (
            <p className="ink-flat border-dashed px-5 py-8 text-center text-base">
              Rutina vacía. Sumale ejercicios del catálogo acá abajo.
            </p>
          ) : (
            <ul className="border-ink border-t-2">
              {rows.map((row, i) => (
                <li
                  key={row.id}
                  className="border-ink grid grid-cols-[2.2rem_1fr] items-center gap-x-3 gap-y-2 border-b-2 py-3 sm:grid-cols-[2.5rem_1fr_auto_auto]"
                >
                  <span className="font-head text-teal text-2xl leading-none font-black">
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <div className="min-w-0">
                    <span className="font-head block text-xl leading-tight font-black tracking-wide uppercase">
                      {row.name}
                    </span>
                    <span className="text-xs tracking-[0.2em] uppercase opacity-50">{row.zone}</span>
                  </div>

                  <div className="col-span-2 flex items-center gap-1 sm:col-span-1">
                    <input
                      name={`sets-${row.id}`}
                      type="number"
                      min={1}
                      max={20}
                      defaultValue={row.targetSets}
                      aria-label={`Series de ${row.name}`}
                      className="field w-12 py-0.5 text-xl"
                    />
                    <span className="font-head text-lg font-black opacity-40">×</span>
                    <input
                      name={`reps-${row.id}`}
                      type="number"
                      min={1}
                      max={100}
                      defaultValue={row.targetReps}
                      aria-label={`Repeticiones de ${row.name}`}
                      className="field w-14 py-0.5 text-xl"
                    />
                    <span className="font-head text-lg font-black opacity-40">@</span>
                    <input
                      name={`kg-${row.id}`}
                      type="text"
                      inputMode="decimal"
                      defaultValue={row.targetWeightKg ?? ''}
                      placeholder="—"
                      aria-label={`Peso de ${row.name} en kilos`}
                      className="field w-16 py-0.5 text-xl"
                    />
                    <span className="font-head text-sm font-black opacity-40">KG</span>
                  </div>

                  <div className="col-span-2 flex justify-end gap-1 sm:col-span-1">
                    <RowButton action={moveRow.bind(null, row.id, -1)} label={`Subir ${row.name}`}>
                      ↑
                    </RowButton>
                    <RowButton action={moveRow.bind(null, row.id, 1)} label={`Bajar ${row.name}`}>
                      ↓
                    </RowButton>
                    <RowButton action={removeRow.bind(null, row.id)} label={`Quitar ${row.name}`}>
                      ✕
                    </RowButton>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {rows.length > 0 && (
            <button
              type="submit"
              className="ink-sm ink-press bg-rust font-display mt-5 px-6 py-3 text-base"
            >
              Guardar objetivos
            </button>
          )}
        </form>

        <section className="ink bg-paper-2 mt-10 space-y-6 p-5">
          <div>
            <h2 className="font-head text-xl font-black tracking-wide uppercase">
              Sumar del catálogo
            </h2>
            <form action={addExercise} className="mt-2 flex flex-wrap gap-3">
              <input type="hidden" name="routineId" value={routine.id} />
              <ExerciseSelect
                catalog={catalog}
                label="Ejercicio del catálogo"
                className="min-w-52 flex-1"
              />
              <button
                type="submit"
                className="ink-flat ink-press bg-paper-2 font-head px-4 py-2.5 text-base font-black tracking-[0.15em] uppercase"
              >
                Sumar
              </button>
            </form>
          </div>

          <div className="border-ink/20 border-t-2 pt-5">
            <h2 className="font-head text-xl font-black tracking-wide uppercase">
              Inventar uno nuevo
            </h2>
            <p className="mb-2 text-xs opacity-60">
              Queda en el catálogo compartido, así lo pueden usar todos.
            </p>
            <form action={createExercise} className="flex flex-wrap gap-3">
              <input type="hidden" name="routineId" value={routine.id} />
              <input
                name="name"
                required
                maxLength={40}
                placeholder="Nombre del ejercicio"
                aria-label="Nombre del ejercicio nuevo"
                className="field min-w-44 flex-1 py-1 text-lg"
              />
              <select
                name="zone"
                aria-label="Zona"
                className="ink-flat bg-paper-2 font-head px-3 py-2 text-base font-black tracking-wide uppercase"
              >
                {zones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="ink-flat ink-press bg-paper-2 font-head px-4 py-2 text-base font-black tracking-[0.15em] uppercase"
              >
                Crear
              </button>
            </form>
          </div>
        </section>

        <form action={deleteRoutine} className="mt-10">
          <input type="hidden" name="routineId" value={routine.id} />
          <button
            type="submit"
            className="font-head text-sm font-bold tracking-[0.2em] uppercase underline decoration-rust decoration-2 underline-offset-4 opacity-60"
          >
            Borrar esta rutina
          </button>
        </form>
      </main>
    </>
  )
}

function RowButton({
  action,
  label,
  children,
}: {
  action: () => Promise<void>
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="submit"
      formAction={action}
      aria-label={label}
      className="ink-flat ink-press font-head h-9 w-9 text-lg leading-none font-black"
    >
      {children}
    </button>
  )
}
