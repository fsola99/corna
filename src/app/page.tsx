import { and, gte, isNotNull, lte } from 'drizzle-orm'
import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { Header } from '@/components/header'
import { Marquee } from '@/components/marquee'
import { db } from '@/db'
import { attendance, routines, workoutSessions } from '@/db/schema'
import { groupMembers, requireGroup } from '@/lib/groups'
import { requireUser } from '@/lib/session'
import { openSessionId } from '@/lib/workout'
import { shiftWeek, today, weekLabel, weekOf } from '@/lib/week'
import { startSession } from './sesion/actions'
import { WeekGrid, type Cells } from './week-grid'

export default async function Page({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const me = await requireUser()
  const group = await requireGroup(me.id)
  const offset = Number((await searchParams).w ?? 0) || 0
  const todayStr = today()
  const days = weekOf(shiftWeek(todayStr, offset))

  const inWeek = (col: typeof attendance.day | typeof workoutSessions.day) =>
    and(gte(col, days[0]), lte(col, days[6]))

  const [friends, plans, done, myRoutines, currentSession] = await Promise.all([
    groupMembers(group.id),
    db.select().from(attendance).where(inWeek(attendance.day)),
    db
      .select({
        userId: workoutSessions.userId,
        day: workoutSessions.day,
        cornaldo: workoutSessions.cornaldo,
      })
      .from(workoutSessions)
      .where(and(inWeek(workoutSessions.day), isNotNull(workoutSessions.endedAt))),
    db
      .select({ id: routines.id, name: routines.name, isDefault: routines.isDefault })
      .from(routines)
      .where(eq(routines.userId, me.id))
      .orderBy(routines.id),
    openSessionId(me.id),
  ])

  const cells: Cells = {}
  for (const plan of plans) {
    cells[`${plan.userId}:${plan.day}`] = { going: plan.going, done: false, cornaldo: null }
  }
  for (const session of done) {
    const key = `${session.userId}:${session.day}`
    cells[key] = {
      going: cells[key]?.going ?? true,
      done: true,
      cornaldo: session.cornaldo,
    }
  }

  const ticker = buildTicker(friends, done)
  const defaultRoutine = myRoutines.find((r) => r.isDefault) ?? myRoutines[0]

  return (
    <>
      <Header user={me} group={group} active="semana" />
      <Marquee items={ticker} />

      <main className="mx-auto max-w-5xl px-4 pt-8 pb-16">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h1 className="font-head text-3xl leading-none font-black tracking-tight uppercase sm:text-5xl">
            {offset === 0 ? 'Esta semana' : weekLabel(days)}
            <span className="font-body block text-xs font-normal tracking-[0.2em] normal-case opacity-60">
              {offset === 0 ? weekLabel(days) : 'semana pasada'}
            </span>
          </h1>

          <div className="flex shrink-0 gap-1">
            <WeekLink to={offset - 1} label="←" />
            {offset !== 0 && <WeekLink to={0} label="hoy" />}
            <WeekLink to={offset + 1} label="→" disabled={offset >= 0} />
          </div>
        </div>

        <WeekGrid
          days={days}
          friends={friends}
          cells={cells}
          meId={me.id}
          todayStr={todayStr}
        />

        <p className="mt-3 text-sm opacity-70">
          Tocá tus casilleros para anotarte. Se llenan solos cuando terminás una sesión.
        </p>

        <section className="ink bg-paper mt-10 p-5 sm:p-7">
          {currentSession ? (
            <>
              <h2 className="font-head text-2xl font-black tracking-wide uppercase">
                Tenés una sesión abierta
              </h2>
              <p className="mt-1 mb-4 text-sm opacity-70">
                Quedó sin cerrar. Seguí donde ibas o cerrala con tu cornaldo.
              </p>
              <Link
                href="/sesion"
                className="ink-sm ink-press bg-pink font-display inline-block px-6 py-3 text-lg"
              >
                Seguir la sesión
              </Link>
            </>
          ) : (
            <>
              <h2 className="font-head text-2xl font-black tracking-wide uppercase">
                Empezar una sesión
              </h2>
              <p className="mt-1 mb-4 text-sm opacity-70">
                {myRoutines.length > 0
                  ? 'Elegí con qué rutina entrenás hoy.'
                  : 'Todavía no armaste ninguna rutina. Podés entrenar suelto y anotar sobre la marcha.'}
              </p>

              <form action={startSession} className="flex flex-wrap items-stretch gap-3">
                <select
                  name="routineId"
                  defaultValue={defaultRoutine ? String(defaultRoutine.id) : 'libre'}
                  aria-label="Rutina"
                  className="ink-flat bg-paper font-head min-w-52 px-3 py-3 text-lg font-black tracking-wide uppercase"
                >
                  {myRoutines.map((routine) => (
                    <option key={routine.id} value={routine.id}>
                      {routine.name}
                      {routine.isDefault ? ' (por defecto)' : ''}
                    </option>
                  ))}
                  <option value="libre">Sesión suelta</option>
                </select>

                <button
                  type="submit"
                  className="ink-sm ink-press bg-pink font-display px-6 py-3 text-lg"
                >
                  Arrancar
                </button>

                <Link
                  href="/rutinas"
                  className="font-head self-center text-base font-bold tracking-widest uppercase underline decoration-blue decoration-2 underline-offset-4"
                >
                  Editar rutinas
                </Link>
              </form>
            </>
          )}
        </section>
      </main>
    </>
  )
}

function WeekLink({ to, label, disabled }: { to: number; label: string; disabled?: boolean }) {
  if (disabled) {
    return (
      <span className="font-head border-ink/20 border-2 px-3 py-1 text-lg font-black opacity-30">
        {label}
      </span>
    )
  }
  return (
    <Link
      href={to === 0 ? '/' : `/?w=${to}`}
      className="ink-flat ink-press font-head bg-paper px-3 py-1 text-lg font-black tracking-widest uppercase"
    >
      {label}
    </Link>
  )
}

function buildTicker(
  friends: { id: number; name: string }[],
  done: { userId: number; cornaldo: number | null }[],
): string[] {
  if (friends.length === 0) return []
  if (done.length === 0) return ['la semana está en blanco', 'nadie tocó un fierro todavía']

  const counts = new Map<number, number>()
  for (const session of done) counts.set(session.userId, (counts.get(session.userId) ?? 0) + 1)

  const items = friends.map((friend) => {
    const n = counts.get(friend.id) ?? 0
    return `${friend.name} ${n} ${n === 1 ? 'sesión' : 'sesiones'}`
  })

  const best = done.reduce<{ userId: number; cornaldo: number | null } | null>(
    (top, session) => ((session.cornaldo ?? 0) > (top?.cornaldo ?? 0) ? session : top),
    null,
  )
  if (best?.cornaldo) {
    const name = friends.find((f) => f.id === best.userId)?.name ?? ''
    items.push(`mejor cornaldo ${best.cornaldo} · ${name}`)
  }

  return items
}
