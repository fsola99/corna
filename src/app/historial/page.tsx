import { and, asc, desc, eq, isNotNull, sql } from 'drizzle-orm'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Sigil } from '@/components/sigil'
import { ProgressChart, type Point } from '@/components/progress-chart'
import { db } from '@/db'
import { exercises, routines, setLogs, workoutSessions } from '@/db/schema'
import { cornaldoLabel, cornaldoMark } from '@/lib/cornaldo'
import { groupMembers, requireGroup } from '@/lib/groups'
import { requireUser } from '@/lib/session'
import { longDay } from '@/lib/week'

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ej?: string }>
}) {
  const me = await requireUser()
  const params = await searchParams
  const group = await requireGroup(me.id)

  const friends = await groupMembers(group.id)
  const who = friends.find((f) => f.id === Number(params.de))?.id ?? me.id
  const whoName = friends.find((f) => f.id === who)?.name ?? me.name
  const isMe = who === me.id

  const [sessions, logged] = await Promise.all([
    db
      .select({
        id: workoutSessions.id,
        day: workoutSessions.day,
        startedAt: workoutSessions.startedAt,
        endedAt: workoutSessions.endedAt,
        cornaldo: workoutSessions.cornaldo,
        note: workoutSessions.note,
        routineName: routines.name,
        sets: sql<number>`count(${setLogs.id})`,
        volume: sql<number>`coalesce(sum(${setLogs.reps} * ${setLogs.weightKg}), 0)`,
      })
      .from(workoutSessions)
      .leftJoin(routines, eq(routines.id, workoutSessions.routineId))
      .leftJoin(setLogs, eq(setLogs.sessionId, workoutSessions.id))
      .where(and(eq(workoutSessions.userId, who), isNotNull(workoutSessions.endedAt)))
      .groupBy(workoutSessions.id, routines.name)
      .orderBy(desc(workoutSessions.day), desc(workoutSessions.id))
      .limit(40),
    db
      .selectDistinct({ id: exercises.id, name: exercises.name })
      .from(setLogs)
      .innerJoin(exercises, eq(exercises.id, setLogs.exerciseId))
      .innerJoin(workoutSessions, eq(workoutSessions.id, setLogs.sessionId))
      .where(and(eq(workoutSessions.userId, who), isNotNull(workoutSessions.endedAt)))
      .orderBy(asc(exercises.name)),
  ])

  const picked = logged.find((e) => e.id === Number(params.ej)) ?? logged[0]

  return (
    <>
      <Header user={me} group={group} active="historial" />

      <main className="mx-auto max-w-3xl px-4 pt-8 pb-16">
        <h1 className="font-head text-4xl leading-none font-black tracking-tight uppercase sm:text-6xl">
          Historial
        </h1>

        <nav aria-label="De quién" className="mt-4 flex flex-wrap gap-2">
          {friends.map((friend) => (
            <Link
              key={friend.id}
              href={friend.id === me.id ? '/historial' : `/historial?de=${friend.id}`}
              aria-current={friend.id === who ? 'page' : undefined}
              className={`font-head px-3 py-1.5 text-sm font-black tracking-[0.15em] uppercase ${
                friend.id === who ? 'ink-flat bg-rust' : 'ink-flat bg-paper-2 opacity-60'
              }`}
            >
              {friend.name}
            </Link>
          ))}
        </nav>

        {sessions.length === 0 ? (
          <p className="ink-flat mt-8 border-dashed px-5 py-10 text-center text-base">
            {isMe
              ? 'Todavía no cerraste ninguna sesión. Cuando termines la primera, acá aparece.'
              : `${whoName} todavía no cerró ninguna sesión.`}
          </p>
        ) : (
          <>
            {picked && (
              <section className="ink bg-paper-2 mt-8 p-5 sm:p-7">
                <form method="get" className="mb-5 flex flex-wrap items-end gap-3">
                  {!isMe && <input type="hidden" name="de" value={who} />}
                  <label className="min-w-52 flex-1">
                    <span className="font-head block text-sm font-bold tracking-[0.2em] uppercase">
                      Progresión de
                    </span>
                    <select
                      name="ej"
                      defaultValue={picked.id}
                      className="ink-flat bg-paper-2 font-head mt-1 w-full px-3 py-2.5 text-base font-black tracking-wide uppercase"
                    >
                      {logged.map((exercise) => (
                        <option key={exercise.id} value={exercise.id}>
                          {exercise.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="submit"
                    className="ink-flat ink-press bg-paper-2 font-head px-4 py-2.5 text-base font-black tracking-[0.15em] uppercase"
                  >
                    Ver
                  </button>
                </form>

                <Progression userId={who} exerciseId={picked.id} name={picked.name} />
              </section>
            )}

            <section className="mt-10">
              <h2 className="font-head text-teal text-sm font-black tracking-[0.25em] uppercase">
                {isMe ? 'Tus sesiones' : `Sesiones de ${whoName}`}
              </h2>

              <ul className="border-ink mt-2 border-t-2">
                {sessions.map((session) => {
                  const minutes = session.endedAt
                    ? Math.round((+session.endedAt - +session.startedAt) / 60000)
                    : null
                  const volume = Math.round(Number(session.volume))

                  return (
                    <li key={session.id} className="border-ink border-b-2 py-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <span className="font-head text-xl leading-none font-black tracking-wide uppercase">
                          {session.routineName ?? 'Sesión suelta'}
                          <span className="font-body ml-2 text-xs font-normal tracking-normal normal-case opacity-60">
                            {longDay(session.day)}
                          </span>
                        </span>

                        {session.cornaldo !== null && (
                          <span
                            className={`flex items-center gap-1.5 ${cornaldoMark(session.cornaldo)}`}
                          >
                            <span className="flex gap-0.5" aria-hidden="true">
                              {[1, 2, 3, 4, 5].map((step) => (
                                <Sigil
                                  key={step}
                                  filled={step <= session.cornaldo!}
                                  className={`h-4 w-4 ${step <= session.cornaldo! ? '' : 'opacity-25'}`}
                                />
                              ))}
                            </span>
                            <span className="font-head text-sm font-black tracking-wide uppercase">
                              {cornaldoLabel(session.cornaldo)}
                            </span>
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm opacity-70">
                        {Number(session.sets)} {Number(session.sets) === 1 ? 'serie' : 'series'}
                        {volume > 0 && ` · ${volume.toLocaleString('es-AR')} kg movidos`}
                        {minutes !== null && ` · ${minutes} min`}
                        {isMe && (
                          <>
                            {' · '}
                            <Link
                              href={`/historial/${session.id}`}
                              className="font-head text-sm font-bold tracking-[0.15em] uppercase underline decoration-teal decoration-2 underline-offset-4 opacity-100"
                            >
                              editar
                            </Link>
                          </>
                        )}
                      </p>

                      {session.note && <p className="mt-1 text-sm italic">«{session.note}»</p>}
                    </li>
                  )
                })}
              </ul>
            </section>
          </>
        )}
      </main>
    </>
  )
}

/** Mejor serie de cada sesión: máximo peso y, a igual peso, más repeticiones. */
async function Progression({
  userId,
  exerciseId,
  name,
}: {
  userId: number
  exerciseId: number
  name: string
}) {
  const logs = await db
    .select({
      sessionId: setLogs.sessionId,
      day: workoutSessions.day,
      reps: setLogs.reps,
      weightKg: setLogs.weightKg,
    })
    .from(setLogs)
    .innerJoin(workoutSessions, eq(workoutSessions.id, setLogs.sessionId))
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(setLogs.exerciseId, exerciseId),
        isNotNull(workoutSessions.endedAt),
      ),
    )
    .orderBy(asc(workoutSessions.day), asc(setLogs.setNumber))

  // Sin peso cargado (dominadas, plancha) la curva que importa es la de repeticiones.
  const unit = logs.some((log) => log.weightKg !== null) ? 'kg' : 'reps'

  const bySession = new Map<number, Point>()
  for (const log of logs) {
    const value = unit === 'kg' ? (log.weightKg ?? 0) : log.reps
    const current = bySession.get(log.sessionId)
    if (!current) {
      bySession.set(log.sessionId, { day: log.day, value, reps: log.reps, sets: 1 })
      continue
    }
    current.sets += 1
    if (value > current.value || (value === current.value && log.reps > current.reps)) {
      current.value = value
      current.reps = log.reps
    }
  }

  const points = [...bySession.values()]

  if (points.length < 2) {
    const only = points[0]
    return (
      <div>
        <p className="font-head text-xl leading-none font-black tracking-wide uppercase">{name}</p>
        <p className="font-head mt-2 text-5xl leading-none font-black">
          {only ? `${only.value} ${unit}` : '—'}
          {only && (
            <span className="font-body ml-2 text-sm font-normal opacity-60">× {only.reps} reps</span>
          )}
        </p>
        <p className="mt-2 text-sm opacity-70">
          Una sola sesión con este ejercicio. Con la próxima empieza la curva.
        </p>
      </div>
    )
  }

  return <ProgressChart points={points} unit={unit} title={name} />
}
