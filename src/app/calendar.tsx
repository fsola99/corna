'use client'

import { useMemo, useOptimistic, useTransition } from 'react'
import { meetups } from '@/lib/meetups'
import { initials, tintOf, type Tint } from '@/lib/people'
import { DAY_LABELS, HOURS, dayNumber, hourSlot, LONG_DAY_LABELS } from '@/lib/week'
import { setAttendance } from './actions'

export type Member = { id: number; name: string }

/** Lo que una persona tiene anotado un día: la hora, y si esa sesión ya pasó. */
export type Plan = { at: string | null; done: boolean }

/** Anotaciones de la semana, indexadas por `${userId}:${day}`. */
export type Plans = Record<string, Plan>

type Who = { member: Member; tint: Tint; isMe: boolean; done: boolean }

/** Las franjas donde el día se parte solo: media mañana, mediodía y tarde. */
const BREAKS = new Set(['10:00', '13:00', '18:00'])

export function Calendar({
  days,
  members,
  plans,
  meId,
  todayStr,
}: {
  days: string[]
  members: Member[]
  plans: Plans
  meId: number
  todayStr: string
}) {
  const [pending, startTransition] = useTransition()
  const [shown, apply] = useOptimistic(
    plans,
    (state: Plans, next: { key: string; plan: Plan | null }) => {
      const copy = { ...state }
      if (next.plan) copy[next.key] = next.plan
      else delete copy[next.key]
      return copy
    },
  )

  const tints = useMemo(
    () => new Map(members.map((member, i) => [member.id, tintOf(i)])),
    [members],
  )

  // Quién cae en cada casilla, y quién se anotó sin una hora que entre en la grilla.
  const { byCell, loose } = useMemo(() => {
    const byCell = new Map<string, Who[]>()
    const loose = new Map<string, Who[]>()

    for (const member of members) {
      for (const day of days) {
        const plan = shown[`${member.id}:${day}`]
        if (!plan) continue

        const hour = hourSlot(plan.at)
        const who: Who = {
          member,
          tint: tints.get(member.id) ?? tintOf(0),
          isMe: member.id === meId,
          done: plan.done,
        }
        const bucket = hour ? byCell : loose
        const key = hour ? `${day} ${hour}` : day
        bucket.set(key, [...(bucket.get(key) ?? []), who])
      }
    }

    return { byCell, loose }
  }, [members, days, shown, tints, meId])

  const crossings = useMemo(
    () =>
      meetups(
        Object.entries(shown).map(([key, plan]) => {
          const [userId, day] = key.split(':')
          return { userId: Number(userId), day, at: plan.at }
        }),
      ).filter((meetup) => days.includes(meetup.day)),
    [shown, days],
  )
  const crossed = useMemo(
    () => new Set(crossings.map((meetup) => `${meetup.day} ${meetup.hour}`)),
    [crossings],
  )

  const names = useMemo(() => new Map(members.map((member) => [member.id, member.name])), [members])

  const toggle = (day: string, hour: string) => {
    const key = `${meId}:${day}`
    const mine = shown[key]
    if (mine?.done) return

    const at = hourSlot(mine?.at ?? null) === hour ? null : hour
    startTransition(async () => {
      apply({ key, plan: at === null ? null : { at, done: false } })
      await setAttendance(day, at)
    })
  }

  return (
    <>
      <Legend members={members} meId={meId} />

      <div className={`overflow-x-auto ${pending ? 'opacity-90' : ''}`}>
        <table className="w-full min-w-[20rem] table-fixed border-collapse">
          <caption className="sr-only">
            Calendario de la semana: a qué hora va cada uno del grupo, de lunes a sábado
          </caption>

          <thead>
            <tr>
              <th className="w-9 sm:w-14" />
              {days.map((day, i) => (
                <th key={day} scope="col" className="pb-2 align-bottom">
                  <span
                    className={`font-head block text-[11px] leading-none font-black tracking-[0.15em] sm:text-sm ${
                      day === todayStr ? 'text-rust' : ''
                    }`}
                  >
                    {DAY_LABELS[i]}
                  </span>
                  <span
                    className={`font-head block text-lg leading-none font-black ${
                      day === todayStr ? 'text-rust' : 'opacity-45'
                    }`}
                  >
                    {dayNumber(day)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {HOURS.map((hour) => (
              <tr key={hour} className={BREAKS.has(hour) ? 'border-ink/30 border-t-2' : ''}>
                <th
                  scope="row"
                  className="font-head pr-1.5 text-right align-middle text-xs leading-none font-black opacity-55 sm:pr-2 sm:text-base"
                >
                  {hour.slice(0, 2)}
                </th>

                {days.map((day, i) => {
                  const key = `${day} ${hour}`
                  const here = byCell.get(key) ?? []
                  const mine = here.some((who) => who.isMe)
                  const locked = shown[`${meId}:${day}`]?.done === true

                  const face = (
                    <span
                      className={`flex min-h-9 w-full flex-wrap content-center items-center justify-center gap-0.5 border-2 p-0.5 sm:min-h-11 ${
                        crossed.has(key)
                          ? 'border-teal bg-teal/30'
                          : here.length > 0
                            ? 'border-ink/45 bg-paper-2'
                            : day === todayStr
                              ? 'border-ink/20 bg-paper-2/40'
                              : 'border-ink/12'
                      }`}
                    >
                      {here.map((who) => (
                        <Chip key={who.member.id} who={who} />
                      ))}
                    </span>
                  )

                  return (
                    <td key={day} className="p-px sm:p-0.5">
                      {locked ? (
                        <span
                          className="block w-full"
                          title={`${label(here, LONG_DAY_LABELS[i], hour, names)} · ya entrenaste ese día`}
                        >
                          {face}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggle(day, hour)}
                          aria-pressed={mine}
                          aria-label={label(here, LONG_DAY_LABELS[i], hour, names)}
                          className="ink-press block w-full cursor-pointer"
                        >
                          {face}
                        </button>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}

            {loose.size > 0 && (
              <tr className="border-ink/30 border-t-2">
                <th
                  scope="row"
                  className="font-head pr-1.5 text-right align-middle text-[10px] leading-none font-black opacity-55 sm:pr-2 sm:text-xs"
                  title="Anotados ese día, sin una hora que entre en la grilla"
                >
                  S/H
                </th>
                {days.map((day) => (
                  <td key={day} className="p-px sm:p-0.5">
                    <span className="border-ink/12 flex min-h-9 w-full flex-wrap content-center items-center justify-center gap-0.5 border-2 border-dashed p-0.5 sm:min-h-11">
                      {(loose.get(day) ?? []).map((who) => (
                        <Chip key={who.member.id} who={who} />
                      ))}
                    </span>
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-sm opacity-70">
        Tocá una casilla para anotarte ese día a esa hora; tocá la tuya de nuevo para borrarla. El
        casillero <span className="text-teal font-bold">verdín</span> es un cruce: ahí coinciden dos
        o más.
        {loose.size > 0 && ' En el renglón S/H caen los que van ese día sin una hora en la grilla.'}
      </p>

      <Crossings crossings={crossings} names={names} days={days} />
    </>
  )
}

function Chip({ who }: { who: Who }) {
  return (
    <span
      className={`font-head border-2 px-1 text-[10px] leading-tight font-black tracking-tight sm:text-xs ${
        who.done ? who.tint.solid : `bg-transparent ${who.tint.ghost}`
      }`}
    >
      {who.isMe ? 'VOS' : initials(who.member.name)}
    </span>
  )
}

function Legend({ members, meId }: { members: Member[]; meId: number }) {
  return (
    <ul className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
      {members.map((member, i) => (
        <li key={member.id} className="flex items-center gap-1.5">
          <span
            className={`font-head border-2 bg-transparent px-1 text-[10px] leading-tight font-black tracking-tight sm:text-xs ${
              tintOf(i).ghost
            }`}
          >
            {member.id === meId ? 'VOS' : initials(member.name)}
          </span>
          <span className="font-head text-sm font-black tracking-wide uppercase">
            {member.name}
          </span>
        </li>
      ))}
    </ul>
  )
}

function Crossings({
  crossings,
  names,
  days,
}: {
  crossings: { day: string; hour: string; userIds: number[] }[]
  names: Map<number, string>
  days: string[]
}) {
  return (
    <section className="ink bg-paper-2 mt-8 p-4 sm:p-5">
      <h2 className="font-head text-xl font-black tracking-wide uppercase sm:text-2xl">
        Se cruzan
      </h2>

      {crossings.length === 0 ? (
        <p className="mt-1 text-sm opacity-70">
          Por ahora nadie coincide. Anotate en las casillas que te sirvan y aparecen acá.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5">
          {crossings.map((meetup) => (
            <li key={`${meetup.day} ${meetup.hour}`} className="flex items-baseline gap-2">
              <span className="font-head w-[5.5rem] shrink-0 text-base font-black tracking-wide uppercase">
                {DAY_LABELS[days.indexOf(meetup.day)]} {meetup.hour}
              </span>
              <span className="font-head text-teal text-base font-black tracking-wide uppercase">
                {meetup.userIds.map((id) => names.get(id) ?? '?').join(' + ')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function label(here: Who[], dayLabel: string, hour: string, names: Map<number, string>): string {
  if (here.length === 0) return `${dayLabel} ${hour}: libre`
  return `${dayLabel} ${hour}: ${here.map((who) => names.get(who.member.id) ?? '?').join(', ')}`
}
