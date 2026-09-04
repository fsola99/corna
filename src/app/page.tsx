import { and, gte, inArray, lte } from 'drizzle-orm'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Marquee } from '@/components/marquee'
import { db } from '@/db'
import { attendance, weeklyPlans } from '@/db/schema'
import { groupMembers, requireGroup } from '@/lib/groups'
import { meetups } from '@/lib/meetups'
import { resolveWeek, seriesMap } from '@/lib/plans'
import { requireUser } from '@/lib/session'
import { longDay, shiftWeek, today, weekLabel, weekOf } from '@/lib/week'
import { Calendar } from './calendar'

export default async function Page({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const me = await requireUser()
  const group = await requireGroup(me.id)
  const offset = Number((await searchParams).w ?? 0) || 0
  const todayStr = today()
  const days = weekOf(shiftWeek(todayStr, offset))

  const members = await groupMembers(group.id)
  const ids = members.map((member) => member.id)

  const [exceptions, series] = await Promise.all([
    db
      .select({
        userId: attendance.userId,
        day: attendance.day,
        going: attendance.going,
        startAt: attendance.startAt,
        endAt: attendance.endAt,
      })
      .from(attendance)
      .where(
        and(
          inArray(attendance.userId, ids),
          gte(attendance.day, days[0]),
          lte(attendance.day, days[days.length - 1]),
        ),
      ),
    db
      .select({
        userId: weeklyPlans.userId,
        weekday: weeklyPlans.weekday,
        startAt: weeklyPlans.startAt,
        endAt: weeklyPlans.endAt,
      })
      .from(weeklyPlans)
      .where(inArray(weeklyPlans.userId, ids)),
  ])

  const cells = resolveWeek({ days, series, exceptions })

  const names = new Map(members.map((member) => [member.id, member.name]))
  const ticker = meetups(
    Object.entries(cells).map(([key, plan]) => {
      const [userId, day] = key.split(':')
      return { userId: Number(userId), day, startAt: plan.startAt, endAt: plan.endAt }
    }),
  ).map(
    (meetup) =>
      `${longDay(meetup.day)} ${meetup.startAt}–${meetup.endAt} · ${meetup.userIds
        .map((id) => names.get(id) ?? '')
        .join(' + ')}`,
  )

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
          series={seriesMap(series)}
          meId={me.id}
          todayStr={todayStr}
        />
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
