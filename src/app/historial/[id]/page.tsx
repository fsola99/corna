import { and, asc, eq } from 'drizzle-orm'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CornaldoPicker } from '@/components/cornaldo-picker'
import { ExerciseSelect } from '@/components/exercise-select'
import { Header } from '@/components/header'
import { db } from '@/db'
import { exercises, routines, setLogs, workoutSessions } from '@/db/schema'
import { activeGroup } from '@/lib/groups'
import { requireUser } from '@/lib/session'
import {
  addExerciseToPastSession,
  addSetLog,
  deleteSession,
  deleteSetLog,
  saveSession,
} from '../actions'

export default async function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser()
  const group = await activeGroup(me.id)
  const sessionId = Number((await params).id)
  if (!Number.isFinite(sessionId)) notFound()

  const [[session], logs, catalog] = await Promise.all([
    db
      .select({
        id: workoutSessions.id,
        day: workoutSessions.day,
        cornaldo: workoutSessions.cornaldo,
        note: workoutSessions.note,
        routineName: routines.name,
      })
      .from(workoutSessions)
      .leftJoin(routines, eq(routines.id, workoutSessions.routineId))
      .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, me.id))),
    db
      .select({
        id: setLogs.id,
        exerciseId: setLogs.exerciseId,
        name: exercises.name,
        setNumber: setLogs.setNumber,
        reps: setLogs.reps,
        weightKg: setLogs.weightKg,
      })
      .from(setLogs)
      .innerJoin(exercises, eq(exercises.id, setLogs.exerciseId))
      .where(eq(setLogs.sessionId, sessionId))
      .orderBy(asc(setLogs.id)),
    db.select().from(exercises).orderBy(asc(exercises.zone), asc(exercises.name)),
  ])

  if (!session) notFound()

  // Agrupadas en el orden en que se hicieron, que es el orden en que se anotaron.
  const blocks = new Map<number, { name: string; sets: typeof logs }>()
  for (const log of logs) {
    const block = blocks.get(log.exerciseId) ?? { name: log.name, sets: [] }
    block.sets.push(log)
    blocks.set(log.exerciseId, block)
  }
  for (const block of blocks.values()) block.sets.sort((a, b) => a.setNumber - b.setNumber)

  return (
    <>
      <Header user={me} group={group} active="historial" />

      <main className="mx-auto max-w-3xl px-4 pt-8 pb-16">
        <Link
          href="/historial"
          className="font-head text-sm font-bold tracking-[0.2em] uppercase underline decoration-teal decoration-2 underline-offset-4"
        >
          ← Todo el historial
        </Link>

        <form action={saveSession} className="mt-4">
          <input type="hidden" name="sessionId" value={session.id} />

          <div className="border-ink flex flex-wrap items-end justify-between gap-4 border-b-2 pb-4">
            <h1 className="font-head text-3xl leading-none font-black tracking-tight uppercase sm:text-5xl">
              {session.routineName ?? 'Sesión suelta'}
            </h1>
            <label>
              <span className="font-head block text-xs font-black tracking-[0.2em] uppercase">
                Día
              </span>
              <input
                name="day"
                type="date"
                defaultValue={session.day}
                className="field py-0.5 text-xl"
              />
            </label>
          </div>

          <div className="ink bg-paper-2 mt-6 p-5">
            <span className="font-head block text-sm font-bold tracking-[0.2em] uppercase">
              Cornaldo
            </span>
            <div className="mt-2">
              <CornaldoPicker defaultValue={session.cornaldo} />
            </div>

            <label className="mt-4 block">
              <span className="font-head block text-sm font-bold tracking-[0.2em] uppercase">
                Nota
              </span>
              <input
                name="note"
                maxLength={140}
                defaultValue={session.note ?? ''}
                placeholder="Sin nota"
                className="field mt-1 w-full py-1 text-left text-lg"
              />
            </label>
          </div>

          {blocks.size === 0 ? (
            <p className="ink-flat mt-8 border-dashed px-5 py-8 text-center text-base">
              Esta sesión no tiene ninguna serie anotada. Sumale un ejercicio acá abajo.
            </p>
          ) : (
            [...blocks].map(([exerciseId, block]) => (
              <section key={exerciseId} className="mt-8">
                <h2 className="font-head border-ink border-b-2 pb-1 text-xl font-black tracking-wide uppercase">
                  {block.name}
                </h2>

                <ul>
                  {block.sets.map((log) => (
                    <li
                      key={log.id}
                      className="border-ink/20 flex flex-wrap items-center gap-x-2 gap-y-1 border-b py-2"
                    >
                      <span className="font-head text-teal w-7 text-lg leading-none font-black">
                        {String(log.setNumber).padStart(2, '0')}
                      </span>
                      <input
                        name={`reps-${log.id}`}
                        type="number"
                        min={1}
                        max={100}
                        defaultValue={log.reps}
                        aria-label={`Repeticiones de la serie ${log.setNumber} de ${block.name}`}
                        className="field w-16 py-0.5 text-xl"
                      />
                      <span className="font-head text-lg font-black opacity-40">×</span>
                      <input
                        name={`kg-${log.id}`}
                        type="text"
                        inputMode="decimal"
                        defaultValue={log.weightKg ?? ''}
                        placeholder="—"
                        aria-label={`Peso de la serie ${log.setNumber} de ${block.name}`}
                        className="field w-20 py-0.5 text-xl"
                      />
                      <span className="font-head text-sm font-black opacity-40">KG</span>

                      <button
                        type="submit"
                        formAction={deleteSetLog.bind(null, log.id)}
                        aria-label={`Borrar la serie ${log.setNumber} de ${block.name}`}
                        className="ink-flat ink-press font-head ml-auto h-9 w-9 text-lg leading-none font-black"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>

                <button
                  type="submit"
                  formAction={addSetLog.bind(null, exerciseId)}
                  className="ink-flat ink-press bg-paper-2 font-head mt-2 px-3 py-1.5 text-sm font-black tracking-[0.15em] uppercase"
                >
                  + Sumar serie
                </button>
              </section>
            ))
          )}

          <div className="ink bg-paper-2 mt-10 p-5">
            <span className="font-head block text-sm font-bold tracking-[0.2em] uppercase">
              Sumar un ejercicio que no quedó anotado
            </span>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <ExerciseSelect
                catalog={catalog}
                name="nuevoEjercicio"
                label="Ejercicio a sumar"
                className="min-w-52 flex-1"
              />
              <button
                type="submit"
                formAction={addExerciseToPastSession}
                className="ink-flat ink-press bg-paper-2 font-head px-4 py-2.5 text-base font-black tracking-[0.15em] uppercase"
              >
                Sumar
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="ink-sm ink-press bg-rust font-display mt-8 px-6 py-3 text-base"
          >
            Guardar cambios
          </button>
        </form>

        <details className="mt-10">
          <summary className="font-head cursor-pointer text-sm font-bold tracking-[0.2em] uppercase underline decoration-rust decoration-2 underline-offset-4 opacity-60">
            Borrar esta sesión
          </summary>
          <form action={deleteSession} className="mt-3">
            <input type="hidden" name="sessionId" value={session.id} />
            <p className="mb-2 text-sm opacity-70">
              Se van también todas sus series. No hay vuelta atrás.
            </p>
            <button
              type="submit"
              className="ink-flat ink-press bg-paper-2 font-head px-4 py-2 text-sm font-black tracking-[0.15em] uppercase"
            >
              Sí, borrala
            </button>
          </form>
        </details>
      </main>
    </>
  )
}
