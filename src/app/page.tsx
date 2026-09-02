import { and, eq, gte, inArray, isNotNull, lte } from 'drizzle-orm'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Marquee } from '@/components/marquee'
import { db } from '@/db'
import { attendance, routines, workoutSessions } from '@/db/schema'
import { groupMembers, requireGroup } from '@/lib/groups'
import { meetups } from '@/lib/meetups'
import { requireUser } from '@/lib/session'
import { openSessionId } from '@/lib/workout'
import { localHour, longDay, shiftWeek, today, weekLabel, weekOf } from '@/lib/week'
import { startSession } from './sesion/actions'
import { Calendar, type Plans } from './calendar'

export default async function Page({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const me = await requireUser()
  const group = await requireGroup(me.id)
  const offset = Number((await searchParams).w ?? 0) || 0
  const todayStr = today()
  const days = weekOf(shiftWeek(todayStr, offset))

  const members = await groupMembers(group.id)
  const ids = members.map((member) => member.id)

  const inWeek = (col: typeof attendance.day | typeof workoutSessions.day) =>
    and(gte(col, days[0]), lte(col, days[days.length - 1]))

  const [plans, done, myRoutines, currentSession] = await Promise.all([
    db
      .select({ userId: attendance.userId, day: attendance.day, at: attendance.at })
      .from(attendance)
      .where(and(inArray(attendance.userId, ids), eq(attendance.going, true), inWeek(attendance.day))),
    db
      .select({
        userId: workoutSessions.userId,
        day: workoutSessions.day,
        startedAt: workoutSessions.startedAt,
      })
      .from(workoutSessions)
      .where(
        and(
          inArray(workoutSessions.userId, ids),
          inWeek(workoutSessions.day),
          isNotNull(workoutSessions.endedAt),
        ),
      ),
    db
      .select({ id: routines.id, name: routines.name, isDefault: routines.isDefault })
      .from(routines)
      .where(eq(routines.userId, me.id))
      .orderBy(routines.id),
    openSessionId(me.id),
  ])

  const cells: Plans = {}
  for (const plan of plans) {
    cells[`${plan.userId}:${plan.day}`] = { at: plan.at, done: false }
  }
  // Una sesión terminada manda: si no había nada anotado, entra a la hora en que arrancó.
  for (const session of done) {
    const key = `${session.userId}:${session.day}`
    cells[key] = { at: cells[key]?.at ?? localHour(session.startedAt), done: true }
  }

  const names = new Map(members.map((member) => [member.id, member.name]))
  const ticker = meetups(
    Object.entries(cells).map(([key, plan]) => {
      const [userId, day] = key.split(':')
      return { userId: Number(userId), day, at: plan.at }
    }),
  ).map(
    (meetup) =>
      `${longDay(meetup.day)} ${meetup.hour} · ${meetup.userIds
        .map((id) => names.get(id) ?? '')
        .join(' + ')}`,
  )

  const defaultRoutine = myRoutines.find((routine) => routine.isDefault) ?? myRoutines[0]

  return (
    <>
      <Header user={me} group={group} active="semana" />
      <Marquee items={ticker.length > 0 ? ticker : ['todavía nadie coincide esta semana']} />

      <main className="mx-auto max-w-5xl px-4 pt-8 pb-16">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h1 className="font-head text-3xl leading-none font-black tracking-tight uppercase sm:text-5xl">
            {offset === 0 ? 'Esta semana' : weekLabel(days)}
            <span className="font-body block text-xs font-normal tracking-[0.2em] normal-case opacity-60">
              {offset === 0 ? weekLabel(days) : 'otra semana'}
            </span>
          </h1>

          <div className="flex shrink-0 gap-1">
            <WeekLink to={offset - 1} label="←" />
            {offset !== 0 && <WeekLink to={0} label="hoy" />}
            <WeekLink to={offset + 1} label="→" />
          </div>
        </div>

        <Calendar
          days={days}
          members={members}
          plans={cells}
          meId={me.id}
          todayStr={todayStr}
        />

        <section className="border-ink/25 mt-10 border-t-2 pt-5">
          {currentSession ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="font-head text-lg font-black tracking-wide uppercase">
                Tenés una sesión abierta
              </span>
              <Link
                href="/sesion"
                className="ink-sm ink-press bg-rust font-head px-4 py-2 text-base font-black tracking-widest uppercase"
              >
                Seguir
              </Link>
            </div>
          ) : (
            <form action={startSession} className="flex flex-wrap items-center gap-2">
              <span className="font-head mr-1 text-sm font-black tracking-[0.2em] uppercase opacity-55">
                Entrenar ahora
              </span>
              <select
                name="routineId"
                defaultValue={defaultRoutine ? String(defaultRoutine.id) : 'libre'}
                aria-label="Rutina"
                className="ink-flat bg-paper-2 font-head px-2 py-1.5 text-base font-black tracking-wide uppercase"
              >
                {myRoutines.map((routine) => (
                  <option key={routine.id} value={routine.id}>
                    {routine.name}
                  </option>
                ))}
                <option value="libre">Sesión suelta</option>
              </select>
              <button
                type="submit"
                className="ink-flat ink-press font-head px-3 py-1.5 text-base font-black tracking-widest uppercase"
              >
                Arrancar
              </button>
            </form>
          )}
        </section>
      </main>
    </>
  )
}

function WeekLink({ to, label }: { to: number; label: string }) {
  return (
    <Link
      href={to === 0 ? '/' : `/?w=${to}`}
      className="ink-flat ink-press font-head bg-paper-2 px-3 py-1 text-lg font-black tracking-widest uppercase"
    >
      {label}
    </Link>
  )
}
