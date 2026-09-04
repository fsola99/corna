'use client'

import { useMemo, useOptimistic, useState, useTransition } from 'react'
import { meetups, type Meetup } from '@/lib/meetups'
import type { Plans, Series, Source } from '@/lib/plans'
import { initials, tintOf, type Tint } from '@/lib/people'
import {
  atOfSlot,
  DAY_LABELS,
  HOURS,
  LONG_DAY_LABELS,
  SLOTS_PER_HOUR,
  TOTAL_SLOTS,
  closingSlot,
  dayNumber,
  slotOf,
  weekdayOf,
} from '@/lib/week'
import { setAttendance, setWeeklyPlan } from './actions'

export type Member = { id: number; name: string }

/** Qué se está tocando: el día suelto de esta semana, o la semana tipo. */
type Scope = 'week' | 'series'

/** Un turno medido en cuartos de la grilla, con el final afuera: [from, to). */
type Turn = { from: number; to: number }

type Block = Turn & {
  member: Member
  tint: Tint
  isMe: boolean
  startAt: string
  endAt: string
  source: Source
  lane: number
  lanes: number
}

/** Las horas donde el día se parte solo: media mañana, mediodía y tarde. */
const BREAKS = new Set(['10:00', '13:00', '18:00'])

export function Calendar({
  days,
  members,
  plans,
  series,
  meId,
  todayStr,
}: {
  days: string[]
  members: Member[]
  plans: Plans
  series: Series
  meId: number
  todayStr: string
}) {
  const [pendingSave, startTransition] = useTransition()
  const [scope, setScope] = useState<Scope>('week')
  const [precise, setPrecise] = useState(false)
  const [pending, setPending] = useState<{ column: string; slot: number } | null>(null)
  const [hover, setHover] = useState<number | null>(null)

  const [shownPlans, applyPlan] = useOptimistic(
    plans,
    (state: Plans, next: { key: string; plan: Plans[string] | null }) => {
      const copy = { ...state }
      if (next.plan) copy[next.key] = next.plan
      else delete copy[next.key]
      return copy
    },
  )

  const [shownSeries, applySeries] = useOptimistic(
    series,
    (state: Series, next: { key: string; turn: Series[string] | null }) => {
      const copy = { ...state }
      if (next.turn) copy[next.key] = next.turn
      else delete copy[next.key]
      return copy
    },
  )

  const tints = useMemo(
    () => new Map(members.map((member, i) => [member.id, tintOf(i)])),
    [members],
  )
  const names = useMemo(() => new Map(members.map((member) => [member.id, member.name])), [members])

  // Cada columna es un día con fecha, o un día de la semana a secas.
  const columns = useMemo(
    () => (scope === 'week' ? days : DAY_LABELS.map((_, i) => String(i))),
    [scope, days],
  )

  /** Los bloques de cada columna, ya repartidos en carriles para que no se tapen. */
  const byColumn = useMemo(() => {
    const raw = new Map<string, Omit<Block, 'lane' | 'lanes'>[]>()
    const loose = new Map<string, Member[]>()

    for (const member of members) {
      for (const column of columns) {
        const turn =
          scope === 'week' ? shownPlans[`${member.id}:${column}`] : shownSeries[`${member.id}:${column}`]
        if (!turn) continue

        const { startAt, endAt } = turn
        if (!startAt || !endAt) {
          loose.set(column, [...(loose.get(column) ?? []), member])
          continue
        }

        const from = Math.max(0, slotOf(startAt))
        const to = Math.min(TOTAL_SLOTS, slotOf(endAt))
        if (to <= from) {
          loose.set(column, [...(loose.get(column) ?? []), member])
          continue
        }

        raw.set(column, [
          ...(raw.get(column) ?? []),
          {
            member,
            tint: tints.get(member.id) ?? tintOf(0),
            isMe: member.id === meId,
            from,
            to,
            startAt,
            endAt,
            source: 'source' in turn ? turn.source : 'series',
          },
        ])
      }
    }

    const placed = new Map<string, Block[]>()
    for (const [column, blocks] of raw) placed.set(column, inLanes(blocks))
    return { placed, loose }
  }, [members, columns, scope, shownPlans, shownSeries, tints, meId])

  const crossings = useMemo(() => {
    const slots = members.flatMap((member) =>
      columns.flatMap((column) => {
        const turn =
          scope === 'week' ? shownPlans[`${member.id}:${column}`] : shownSeries[`${member.id}:${column}`]
        if (!turn) return []
        return [{ userId: member.id, day: column, startAt: turn.startAt, endAt: turn.endAt }]
      }),
    )
    return meetups(slots)
  }, [members, columns, scope, shownPlans, shownSeries])

  /** El turno que tengo puesto en esa columna, en cuartos. */
  const mine = (column: string): Turn | null => {
    const turn =
      scope === 'week' ? shownPlans[`${meId}:${column}`] : shownSeries[`${meId}:${column}`]
    if (!turn?.startAt || !turn.endAt) return null
    return { from: slotOf(turn.startAt), to: slotOf(turn.endAt) }
  }

  /** El cuarto en el que cierra esa columna: el sábado más temprano que el resto. */
  const closes = (column: string) =>
    closingSlot(scope === 'week' ? weekdayOf(column) : Number(column))

  const commit = (column: string, turn: Turn | null) => {
    const startAt = turn && atOfSlot(turn.from)
    const endAt = turn && atOfSlot(turn.to)

    startTransition(async () => {
      if (scope === 'week') {
        const planned = shownSeries[`${meId}:${weekdayOf(column)}`]
        applyPlan({
          key: `${meId}:${column}`,
          plan:
            startAt === null || endAt === null
              ? null
              : {
                  startAt,
                  endAt,
                  source: !planned
                    ? 'once'
                    : planned.startAt === startAt && planned.endAt === endAt
                      ? 'series'
                      : 'moved',
                },
        })
        await setAttendance(column, startAt, endAt)
      } else {
        applySeries({
          key: `${meId}:${column}`,
          turn: startAt === null || endAt === null ? null : { startAt, endAt },
        })
        await setWeeklyPlan(Number(column), startAt, endAt)
      }
    })
  }

  /**
   * Modo simple: la hora entera. Tocar una hora que pisa el turno lo borra
   * —alcanza con que lo toque, porque a la vista esa hora ya es parte del
   * bloque—, y tocar una que no lo pisa estira el turno hasta ahí.
   */
  const tapHour = (column: string, hourIndex: number) => {
    const from = hourIndex * SLOTS_PER_HOUR
    const to = Math.min(from + SLOTS_PER_HOUR, closes(column))
    const current = mine(column)

    if (!current) return commit(column, { from, to })
    if (current.from < to && from < current.to) return commit(column, null)
    commit(column, { from: Math.min(current.from, from), to: Math.max(current.to, to) })
  }

  /** Modo por cuartos: un toque marca el inicio y el siguiente cierra el turno. */
  const tapSlot = (column: string, slot: number) => {
    if (pending?.column === column) {
      setPending(null)
      setHover(null)
      return commit(column, {
        from: Math.min(pending.slot, slot),
        to: Math.max(pending.slot, slot) + 1,
      })
    }

    const current = mine(column)
    if (!pending && current && current.from <= slot && slot < current.to) return commit(column, null)

    setPending({ column, slot })
    setHover(slot)
  }

  return (
    <>
      <Legend members={members} meId={meId} />

      <div className="border-ink/25 mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 border-y-2 py-3">
        <Switch
          label="Anotás"
          options={[
            { value: 'week', label: 'Esta semana' },
            { value: 'series', label: 'Todas las semanas' },
          ]}
          value={scope}
          onChange={(value) => {
            setScope(value as Scope)
            setPending(null)
          }}
        />
        <Switch
          label="Marcás"
          options={[
            { value: 'hour', label: 'Por hora' },
            { value: 'quarter', label: 'Por cuartos' },
          ]}
          value={precise ? 'quarter' : 'hour'}
          onChange={(value) => {
            setPrecise(value === 'quarter')
            setPending(null)
          }}
        />
      </div>

      <div
        className={`grid grid-cols-[2.25rem_repeat(6,minmax(0,1fr))] gap-x-px [--hour:2.75rem] sm:grid-cols-[3.25rem_repeat(6,minmax(0,1fr))] sm:gap-x-0.5 sm:[--hour:3.5rem] ${
          pendingSave ? 'opacity-90' : ''
        }`}
        style={{ ['--slot' as string]: 'calc(var(--hour) / 4)' }}
      >
        <div />
        {columns.map((column, i) => {
          const isToday = scope === 'week' ? column === todayStr : weekdayOf(todayStr) === i
          return (
            <div key={column} className="pb-2 text-center">
              <span
                className={`font-head block text-[11px] leading-none font-black tracking-[0.15em] sm:text-sm ${
                  isToday ? 'text-rust' : ''
                }`}
              >
                {DAY_LABELS[i]}
              </span>
              <span
                className={`font-head block text-lg leading-none font-black ${
                  isToday ? 'text-rust' : 'opacity-45'
                }`}
              >
                {scope === 'week' ? dayNumber(column) : '↻'}
              </span>
            </div>
          )
        })}

        <div className="font-head pr-1 text-right text-xs leading-none font-black opacity-55 sm:pr-1.5 sm:text-base">
          {HOURS.map((hour) => (
            <div key={hour} className="pt-0.5" style={{ height: 'var(--hour)' }}>
              {hour.slice(0, 2)}
            </div>
          ))}
        </div>

        {columns.map((column, i) => {
          const isToday = scope === 'week' ? column === todayStr : weekdayOf(todayStr) === i
          return (
            <Column
              key={column}
              dayLabel={LONG_DAY_LABELS[i]}
              isToday={isToday}
              precise={precise}
              scope={scope}
              blocks={byColumn.placed.get(column) ?? []}
              closes={closes(column)}
              pending={pending?.column === column ? pending.slot : null}
              hover={pending?.column === column ? hover : null}
              names={names}
              onHour={(hourIndex) => tapHour(column, hourIndex)}
              onSlot={(slot) => tapSlot(column, slot)}
              onHoverSlot={setHover}
            />
          )
        })}
      </div>

      {byColumn.loose.size > 0 && (
        <div className="mt-1 grid grid-cols-[2.25rem_repeat(6,minmax(0,1fr))] gap-x-px sm:grid-cols-[3.25rem_repeat(6,minmax(0,1fr))] sm:gap-x-0.5">
          <div
            className="font-head pr-1 text-right text-[10px] leading-none font-black opacity-55 sm:pr-1.5 sm:text-xs"
            title="Anotados ese día, sin un horario marcado"
          >
            S/H
          </div>
          {columns.map((column) => (
            <div
              key={column}
              className="border-ink/12 flex min-h-8 flex-wrap content-center items-center justify-center gap-0.5 border-2 border-dashed p-0.5"
            >
              {(byColumn.loose.get(column) ?? []).map((member) => (
                <span
                  key={member.id}
                  style={{ ['--tint' as string]: tints.get(member.id) ?? tintOf(0) }}
                  className="font-head border-2 border-[color:var(--tint)] px-1 text-[10px] leading-tight font-black tracking-tight text-[color:var(--tint)]"
                >
                  {member.id === meId ? 'VOS' : initials(member.name)}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      <Instructions scope={scope} precise={precise} pending={pending !== null} />
      <Crossings crossings={crossings} names={names} columns={columns} scope={scope} />
    </>
  )
}

/** Una columna del calendario: el fondo por horas, los turnos y la capa que se toca. */
function Column({
  dayLabel,
  isToday,
  precise,
  scope,
  blocks,
  closes,
  pending,
  hover,
  names,
  onHour,
  onSlot,
  onHoverSlot,
}: {
  dayLabel: string
  isToday: boolean
  precise: boolean
  scope: Scope
  blocks: Block[]
  closes: number
  pending: number | null
  hover: number | null
  names: Map<number, string>
  onHour: (hourIndex: number) => void
  onSlot: (slot: number) => void
  onHoverSlot: (slot: number | null) => void
}) {
  const when = scope === 'week' ? dayLabel : `todos los ${dayLabel}`
  const preview =
    pending !== null
      ? { from: Math.min(pending, hover ?? pending), to: Math.max(pending, hover ?? pending) + 1 }
      : null

  return (
    <div
      className={`relative border-2 ${isToday ? 'border-ink/25 bg-paper-2/40' : 'border-ink/12'}`}
    >
      <div className="relative" style={{ height: 'calc(var(--hour) * 16)' }}>
        {HOURS.map((hour, h) =>
          h === 0 ? null : (
            <div
              key={hour}
              className={`absolute inset-x-0 border-t-2 ${
                BREAKS.has(hour) ? 'border-ink/30' : 'border-ink/12'
              }`}
              style={{ top: `calc(var(--hour) * ${h})` }}
            />
          ),
        )}

        {precise &&
          Array.from({ length: closes }, (_, slot) =>
            slot % SLOTS_PER_HOUR === 0 ? null : (
              <div
                key={slot}
                className="border-ink/10 absolute inset-x-0 border-t border-dashed"
                style={{ top: `calc(var(--slot) * ${slot})` }}
              />
            ),
          )}

        {/* Cuando el gimnasio ya cerró no hay dónde anotarse: el sábado, desde las 18. */}
        {closes < TOTAL_SLOTS && (
          <div
            className="border-ink/20 absolute inset-x-0 bottom-0 border-t-2"
            style={{
              top: `calc(var(--slot) * ${closes})`,
              backgroundImage:
                'repeating-linear-gradient(-45deg, var(--color-ink) 0 1px, transparent 1px 7px)',
              opacity: 0.12,
            }}
            title={`Cerrado desde las ${atOfSlot(closes)}`}
          />
        )}

        {blocks.map((block) => (
          <Turno key={block.member.id} block={block} />
        ))}

        {preview && (
          <div
            className="border-ink pointer-events-none absolute inset-x-0 border-2 border-dashed"
            style={{
              top: `calc(var(--slot) * ${preview.from})`,
              height: `calc(var(--slot) * ${preview.to - preview.from})`,
            }}
          />
        )}

        <div className="absolute inset-0">
          {precise
            ? Array.from({ length: closes }, (_, slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => onSlot(slot)}
                  onMouseEnter={() => onHoverSlot(slot)}
                  onFocus={() => onHoverSlot(slot)}
                  aria-label={`${when} ${atOfSlot(slot)}${
                    pending === null ? ': empezar acá' : `: terminar acá`
                  }`}
                  className="absolute inset-x-0 block w-full cursor-pointer"
                  style={{ top: `calc(var(--slot) * ${slot})`, height: 'var(--slot)' }}
                />
              ))
            : HOURS.map((hour, h) =>
                h * SLOTS_PER_HOUR >= closes ? null : (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => onHour(h)}
                    aria-label={hourLabel(blocks, when, hour, names, closes)}
                    title={hourLabel(blocks, when, hour, names, closes)}
                    className="absolute inset-x-0 block w-full cursor-pointer"
                    style={{
                      top: `calc(var(--hour) * ${h})`,
                      height: `calc(var(--slot) * ${Math.min(SLOTS_PER_HOUR, closes - h * SLOTS_PER_HOUR)})`,
                    }}
                  />
                ),
              )}
        </div>
      </div>
    </div>
  )
}

/**
 * Un turno: un rectángulo que arranca y termina donde arranca y termina la
 * persona, así el calendario se lee de un vistazo. Los que se pisan se reparten
 * el ancho de la columna en carriles.
 */
function Turno({ block }: { block: Block }) {
  const slots = block.to - block.from

  // Las iniciales son lo que se lee de lejos, así que se llevan todo el lugar
  // que haya: el cuerpo se mide contra el bloque mismo —ancho del carril y alto
  // del turno—, así entran enteras lo mismo en una columna sola que en cinco.
  const showsTime = slots >= 4 && block.lanes === 1

  return (
    <div
      className="absolute p-px"
      style={{
        ['--tint' as string]: block.tint,
        top: `calc(var(--slot) * ${block.from})`,
        height: `calc(var(--slot) * ${block.to - block.from})`,
        left: `${(block.lane / block.lanes) * 100}%`,
        width: `${100 / block.lanes}%`,
      }}
      title={`${block.member.name} · ${block.startAt} a ${block.endAt}`}
    >
      <div
        className="font-head text-paper relative flex h-full flex-col items-center justify-center overflow-hidden border-2 border-[color:var(--tint)] bg-[color:var(--tint)] text-center leading-none font-black tracking-tight"
        style={{ containerType: 'size' }}
      >
        <span
          className="relative flex w-full items-center justify-center gap-0.5 overflow-hidden"
          style={{ fontSize: 'clamp(0.5rem, min(34cqw, 52cqh), 1.5rem)' }}
        >
          {block.isMe ? 'VOS' : initials(block.member.name)}
          {block.source !== 'once' && (
            <span className="text-[0.55em] opacity-80">
              {block.source === 'series' ? '↻' : '✎'}
            </span>
          )}
        </span>
        {showsTime && (
          <span
            className="relative mt-0.5 w-full truncate px-0.5 font-bold opacity-75"
            style={{ fontSize: 'clamp(0.5rem, min(15cqw, 14cqh), 0.75rem)' }}
          >
            {block.startAt}–{block.endAt}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Reparte los turnos que se pisan en carriles: el primero que queda libre a esa
 * altura, y si no hay ninguno se abre uno nuevo. Todos los de la columna usan la
 * misma cantidad de carriles, así el ancho no salta entre horas.
 */
function inLanes(blocks: Omit<Block, 'lane' | 'lanes'>[]): Block[] {
  const sorted = [...blocks].sort((a, b) => a.from - b.from || a.to - b.to)
  const ends: number[] = []

  const placed = sorted.map((block) => {
    let lane = ends.findIndex((end) => end <= block.from)
    if (lane === -1) {
      lane = ends.length
      ends.push(block.to)
    } else {
      ends[lane] = block.to
    }
    return { ...block, lane, lanes: 1 }
  })

  return placed.map((block) => ({ ...block, lanes: ends.length }))
}

function Switch({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-head text-[10px] font-black tracking-[0.25em] uppercase opacity-55 sm:text-xs">
        {label}
      </span>
      <div className="flex gap-0.5" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={`font-head px-2 py-1 text-xs font-black tracking-[0.15em] uppercase sm:px-3 sm:text-sm ${
              value === option.value
                ? 'ink-flat bg-rust text-paper'
                : 'ink-press decoration-ink/30 border-2 border-transparent underline decoration-2 underline-offset-4 opacity-65'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Instructions({
  scope,
  precise,
  pending,
}: {
  scope: Scope
  precise: boolean
  pending: boolean
}) {
  return (
    <div className="mt-3 space-y-1.5 text-sm opacity-70">
      <p>
        {precise ? (
          pending ? (
            <b className="text-rust">Ahora tocá dónde termina tu turno.</b>
          ) : (
            <>
              Tocá dónde <b>empieza</b> tu turno y después dónde <b>termina</b>: cada hora está
              partida en cuatro, así entrás a las 8:30 y salís a las 10.
            </>
          )
        ) : (
          <>
            Tocá una hora y quedás anotado esa hora entera. Tocá otra y el turno se estira hasta
            ahí: 08 y después 11 son de 8 a 12. Tocá adentro de tu bloque para borrarlo.
          </>
        )}
      </p>
      <p>
        {scope === 'series' ? (
          <>
            Lo que marcás acá vale <b>todas las semanas</b>. Después, en <i>esta semana</i>, cada
            día suelto se puede correr de horario o cancelar sin tocar la serie.{' '}
          </>
        ) : null}
        <b>↻</b> es lo que viene de la semana tipo y <b>✎</b> lo que ese día se corrió de horario.
        Los ratos en que coinciden dos o más están abajo, en <i>se cruzan</i>.
      </p>
    </div>
  )
}

function Legend({ members, meId }: { members: Member[]; meId: number }) {
  return (
    <ul className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
      {members.map((member, i) => (
        <li key={member.id} className="flex items-center gap-1.5">
          <span
            style={{ ['--tint' as string]: tintOf(i) }}
            className="font-head border-2 border-[color:var(--tint)] px-1 text-[10px] leading-tight font-black tracking-tight text-[color:var(--tint)] sm:text-xs"
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
  columns,
  scope,
}: {
  crossings: Meetup[]
  names: Map<number, string>
  columns: string[]
  scope: Scope
}) {
  return (
    <section className="ink bg-paper-2 mt-8 p-4 sm:p-5">
      <h2 className="font-head text-xl font-black tracking-wide uppercase sm:text-2xl">
        Se cruzan {scope === 'series' && <span className="opacity-55">todas las semanas</span>}
      </h2>

      {crossings.length === 0 ? (
        <p className="mt-1 text-sm opacity-70">
          Por ahora nadie coincide. Marcá los turnos que te sirvan y aparecen acá.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5">
          {crossings.map((meetup) => (
            <li key={`${meetup.day} ${meetup.startAt}`} className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-head w-[8.5rem] shrink-0 text-base font-black tracking-wide uppercase">
                {DAY_LABELS[scope === 'week' ? columns.indexOf(meetup.day) : Number(meetup.day)]}{' '}
                {meetup.startAt}–{meetup.endAt}
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

function hourLabel(
  blocks: Block[],
  when: string,
  hour: string,
  names: Map<number, string>,
  closes: number,
): string {
  const from = slotOf(hour)
  const until = Math.min(from + SLOTS_PER_HOUR, closes)
  const here = blocks.filter((block) => block.from < until && from < block.to)
  const next = atOfSlot(until)
  if (here.length === 0) return `${when} de ${hour} a ${next}: libre`
  const who = here
    .map((block) => `${names.get(block.member.id) ?? '?'} ${block.startAt}–${block.endAt}`)
    .join(', ')
  return `${when} de ${hour} a ${next}: ${who}`
}
