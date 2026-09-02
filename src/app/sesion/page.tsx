import { and, asc, desc, eq, ne } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { ExerciseSelect } from '@/components/exercise-select'
import { Header } from '@/components/header'
import { db } from '@/db'
import { type Exercise, exercises, routines, sessionExercises, setLogs, workoutSessions } from '@/db/schema'
import { activeGroup } from '@/lib/groups'
import { requireUser } from '@/lib/session'
import { openSessionId } from '@/lib/workout'
import { longDay } from '@/lib/week'
import {
  addExerciseToSession,
  bringForward,
  discardSession,
  logSet,
  postpone,
  removeRow,
  setRowStatus,
  swapExercise,
  undoLastSet,
} from './actions'
import { FinishForm } from './finish-form'

type Row = {
  id: number
  exerciseId: number
  name: string
  zone: string
  status: string
  targetSets: number
  targetReps: number
  targetWeightKg: number | null
}

export default async function SessionPage() {
  const me = await requireUser()
  const group = await activeGroup(me.id)
  const sessionId = await openSessionId(me.id)
  if (!sessionId) redirect('/')

  const [[session], rows, logs, history, catalog] = await Promise.all([
    db
      .select({
        id: workoutSessions.id,
        day: workoutSessions.day,
        startedAt: workoutSessions.startedAt,
        routineName: routines.name,
      })
      .from(workoutSessions)
      .leftJoin(routines, eq(routines.id, workoutSessions.routineId))
      .where(eq(workoutSessions.id, sessionId)),
    db
      .select({
        id: sessionExercises.id,
        exerciseId: sessionExercises.exerciseId,
        name: exercises.name,
        zone: exercises.zone,
        status: sessionExercises.status,
        targetSets: sessionExercises.targetSets,
        targetReps: sessionExercises.targetReps,
        targetWeightKg: sessionExercises.targetWeightKg,
      })
      .from(sessionExercises)
      .innerJoin(exercises, eq(exercises.id, sessionExercises.exerciseId))
      .where(eq(sessionExercises.sessionId, sessionId))
      .orderBy(asc(sessionExercises.position), asc(sessionExercises.id)),
    db
      .select()
      .from(setLogs)
      .where(eq(setLogs.sessionId, sessionId))
      .orderBy(asc(setLogs.exerciseId), asc(setLogs.setNumber)),
    db
      .select({
        exerciseId: setLogs.exerciseId,
        reps: setLogs.reps,
        weightKg: setLogs.weightKg,
      })
      .from(setLogs)
      .innerJoin(workoutSessions, eq(workoutSessions.id, setLogs.sessionId))
      .where(and(eq(workoutSessions.userId, me.id), ne(setLogs.sessionId, sessionId)))
      .orderBy(desc(setLogs.createdAt))
      .limit(300),
    db.select().from(exercises).orderBy(asc(exercises.zone), asc(exercises.name)),
  ])

  const doneSets = new Map<number, { reps: number; weightKg: number | null }[]>()
  for (const log of logs) {
    const list = doneSets.get(log.exerciseId) ?? []
    list.push({ reps: log.reps, weightKg: log.weightKg })
    doneSets.set(log.exerciseId, list)
  }

  const lastTime = new Map<number, { reps: number; weightKg: number | null }>()
  for (const log of history) {
    if (!lastTime.has(log.exerciseId)) lastTime.set(log.exerciseId, log)
  }

  const pending = rows.filter((r) => r.status === 'pending')
  const active = pending[0]
  const queue = pending.slice(1)
  const closed = rows.filter((r) => r.status !== 'pending')
  const totalSets = logs.length

  return (
    <>
      <Header user={me} group={group} active="sesion" />

      <main className="mx-auto max-w-3xl px-4 pt-8 pb-40">
        <div className="border-ink flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 pb-3">
          <h1 className="font-head text-3xl leading-none font-black tracking-tight uppercase sm:text-5xl">
            {session.routineName ?? 'Sesión suelta'}
          </h1>
          <p className="font-head text-teal text-lg font-black tracking-[0.15em] uppercase">
            en curso <span className="opacity-50">· {longDay(session.day)}</span>
          </p>
        </div>
        <p className="mt-2 text-sm opacity-70">
          {totalSets === 0
            ? 'Ninguna serie anotada todavía.'
            : `${totalSets} ${totalSets === 1 ? 'serie anotada' : 'series anotadas'}.`}
        </p>

        {active ? (
          <ActiveCard
            row={active}
            sets={doneSets.get(active.exerciseId) ?? []}
            last={lastTime.get(active.exerciseId)}
            catalog={catalog}
          />
        ) : (
          <p className="ink-flat mt-6 border-dashed px-5 py-8 text-center text-base">
            {rows.length === 0
              ? 'La sesión está vacía. Sumá ejercicios acá abajo.'
              : 'Pasaste por todos los ejercicios. Terminá la sesión cuando quieras.'}
          </p>
        )}

        {queue.length > 0 && (
          <section className="mt-8">
            <h2 className="font-head text-teal text-sm font-black tracking-[0.25em] uppercase">
              En cola
            </h2>
            <ul className="border-ink mt-2 border-t-2">
              {queue.map((row) => (
                <li
                  key={row.id}
                  className="border-ink flex flex-wrap items-center justify-between gap-3 border-b-2 py-3"
                >
                  <div className="min-w-0">
                    <span className="font-head block text-lg leading-tight font-black tracking-wide uppercase">
                      {row.name}
                    </span>
                    <span className="text-xs opacity-60">
                      {row.targetSets} × {row.targetReps}
                      {row.targetWeightKg !== null && ` @ ${row.targetWeightKg} kg`}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <SmallButton action={bringForward.bind(null, row.id)}>Hacer ahora</SmallButton>
                    <SmallButton action={removeRow.bind(null, row.id)} label={`Quitar ${row.name}`}>
                      ✕
                    </SmallButton>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {closed.length > 0 && (
          <section className="mt-8">
            <h2 className="font-head text-sm font-black tracking-[0.25em] uppercase opacity-50">
              Cerrados
            </h2>
            <ul className="mt-2 space-y-1">
              {closed.map((row) => {
                const sets = doneSets.get(row.exerciseId) ?? []
                return (
                  <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-3">
                    <span className="font-head text-base font-black tracking-wide uppercase">
                      <span className={row.status === 'skipped' ? 'line-through opacity-50' : ''}>
                        {row.name}
                      </span>
                      <span className="font-body ml-2 text-xs font-normal opacity-60">
                        {row.status === 'skipped'
                          ? 'salteado'
                          : sets.map((s) => `${s.reps}${s.weightKg ? `×${s.weightKg}` : ''}`).join(' · ') ||
                            'sin series'}
                      </span>
                    </span>
                    <SmallButton action={setRowStatus.bind(null, row.id, 'pending')}>
                      Reabrir
                    </SmallButton>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        <form action={addExerciseToSession} className="ink bg-paper-2 mt-10 p-5">
          <span className="font-head block text-sm font-bold tracking-[0.2em] uppercase">
            Sumar un ejercicio
          </span>
          <p className="mb-2 text-xs opacity-60">
            No queda guardado en la rutina: es sólo para hoy.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <ExerciseSelect catalog={catalog} className="min-w-52 flex-1" label="Ejercicio a sumar" />
            <button
              type="submit"
              name="donde"
              value="ahora"
              className="ink-flat ink-press bg-paper-2 font-head px-4 py-2.5 text-base font-black tracking-[0.15em] uppercase"
            >
              Ahora
            </button>
            <button
              type="submit"
              name="donde"
              value="final"
              className="ink-flat ink-press bg-paper-2 font-head px-4 py-2.5 text-base font-black tracking-[0.15em] uppercase"
            >
              Al final
            </button>
          </div>
        </form>

        <div className="mt-10">
          <FinishForm startedAt={session.startedAt.toISOString()} sets={totalSets} />
        </div>

        <form action={discardSession} className="mt-6">
          <button
            type="submit"
            className="font-head text-sm font-bold tracking-[0.2em] uppercase underline decoration-rust decoration-2 underline-offset-4 opacity-60"
          >
            Descartar esta sesión
          </button>
        </form>
      </main>
    </>
  )
}

function ActiveCard({
  row,
  sets,
  last,
  catalog,
}: {
  row: Row
  sets: { reps: number; weightKg: number | null }[]
  last?: { reps: number; weightKg: number | null }
  catalog: Exercise[]
}) {
  const reference = sets.at(-1) ?? last
  const target = `${row.targetSets} × ${row.targetReps}${
    row.targetWeightKg !== null ? ` @ ${row.targetWeightKg} kg` : ''
  }`

  return (
    <section className="ink bg-rust mt-6 p-5 sm:p-7">
      <span className="font-head text-sm font-black tracking-[0.3em] uppercase">Ahora</span>
      <h2 className="font-head text-4xl leading-none font-black tracking-tight uppercase sm:text-6xl">
        {row.name}
      </h2>

      <p className="font-head mt-2 text-base font-bold tracking-[0.1em] uppercase">
        Objetivo {target}
        {last && (
          <span className="opacity-70">
            {' '}
            · la vez pasada {last.reps}
            {last.weightKg !== null && ` × ${last.weightKg} kg`}
          </span>
        )}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {Array.from({ length: Math.max(row.targetSets, sets.length) }).map((_, i) => {
          const set = sets[i]
          return (
            <span
              key={i}
              className={`border-ink font-head flex h-11 min-w-11 items-center justify-center border-2 px-2 text-base font-black ${
                set ? 'bg-paper text-ink' : 'border-dashed opacity-60'
              }`}
            >
              {set ? `${set.reps}${set.weightKg !== null ? `×${set.weightKg}` : ''}` : '—'}
            </span>
          )
        })}
      </div>

      <form
        key={sets.length}
        action={logSet}
        className="border-ink mt-5 flex flex-wrap items-end gap-3 border-t-2 pt-5"
      >
        <input type="hidden" name="rowId" value={row.id} />
        <label>
          <span className="font-head block text-xs font-black tracking-[0.2em] uppercase">
            Reps
          </span>
          <input
            name="reps"
            type="number"
            min={1}
            max={100}
            required
            defaultValue={reference?.reps ?? row.targetReps}
            className="field w-20 py-0.5 text-3xl"
          />
        </label>
        <label>
          <span className="font-head block text-xs font-black tracking-[0.2em] uppercase">Kg</span>
          <input
            name="weight"
            type="text"
            inputMode="decimal"
            defaultValue={reference?.weightKg ?? row.targetWeightKg ?? ''}
            placeholder="—"
            className="field w-24 py-0.5 text-3xl"
          />
        </label>
        <button
          type="submit"
          className="ink-sm ink-press bg-paper-2 font-display px-5 py-3 text-base"
        >
          Anotar serie
        </button>
      </form>

      <div className="border-ink mt-5 flex flex-wrap gap-2 border-t-2 pt-5">
        {sets.length > 0 && (
          <SmallButton action={undoLastSet.bind(null, row.id)}>Borrar última serie</SmallButton>
        )}
        <SmallButton action={postpone.bind(null, row.id)}>Máquina ocupada → al final</SmallButton>
        <SmallButton action={setRowStatus.bind(null, row.id, 'done')}>Listo</SmallButton>
        <SmallButton action={setRowStatus.bind(null, row.id, 'skipped')}>Saltear</SmallButton>
      </div>

      <details className="border-ink mt-5 border-t-2 pt-5">
        <summary className="font-head cursor-pointer text-sm font-black tracking-[0.15em] uppercase">
          Hacer otro en su lugar
        </summary>
        <p className="mt-1 text-xs opacity-70">
          Se queda con el mismo objetivo y el mismo lugar en la cola. La rutina no se toca.
        </p>
        <form
          action={swapExercise.bind(null, row.id)}
          className="mt-2 flex flex-wrap items-end gap-3"
        >
          <ExerciseSelect
            catalog={catalog}
            className="min-w-52 flex-1"
            label={`Reemplazo de ${row.name}`}
            firstZone={row.zone}
            exclude={row.exerciseId}
          />
          <button
            type="submit"
            className="ink-flat ink-press bg-paper-2 font-head px-4 py-2.5 text-base font-black tracking-[0.15em] uppercase"
          >
            Cambiar
          </button>
        </form>
      </details>
    </section>
  )
}

function SmallButton({
  action,
  children,
  label,
}: {
  action: () => Promise<void>
  children: React.ReactNode
  label?: string
}) {
  return (
    <form action={action}>
      <button
        type="submit"
        aria-label={label}
        className="ink-flat ink-press bg-paper-2 font-head px-3 py-1.5 text-sm font-black tracking-[0.15em] uppercase"
      >
        {children}
      </button>
    </form>
  )
}
