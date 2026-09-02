'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { Sigil } from '@/components/sigil'
import { DAY_LABELS, dayNumber, longDay } from '@/lib/week'
import { setAttendance } from './actions'

export type Cell = { going: boolean; at: string | null; done: boolean; cornaldo: number | null }
export type Cells = Record<string, Cell>

const EMPTY: Cell = { going: false, at: null, done: false, cornaldo: null }

/** Los horarios que se tocan de un golpe; el resto se tipea. */
const QUICK = ['07:00', '08:00', '09:00', '12:00', '18:00', '19:00', '20:00', '21:00']

export function WeekGrid({
  days,
  friends,
  cells,
  meId,
  todayStr,
}: {
  days: string[]
  friends: { id: number; name: string }[]
  cells: Cells
  meId: number
  todayStr: string
}) {
  const [pending, startTransition] = useTransition()
  const [openDay, setOpenDay] = useState<string | null>(null)
  const [shown, apply] = useOptimistic(cells, (state: Cells, next: { key: string; cell: Cell }) => ({
    ...state,
    [next.key]: next.cell,
  }))

  const save = (day: string, going: boolean, at: string | null) => {
    const key = `${meId}:${day}`
    const cell = shown[key] ?? EMPTY
    setOpenDay(null)
    startTransition(async () => {
      apply({ key, cell: { ...cell, going, at: going ? at : null } })
      await setAttendance(day, at, going)
    })
  }

  const mine = openDay ? (shown[`${meId}:${openDay}`] ?? EMPTY) : EMPTY

  return (
    <>
      <table className={`w-full table-fixed border-collapse ${pending ? 'opacity-90' : ''}`}>
        <thead>
          <tr>
            <th className="w-24 sm:w-28" />
            {days.map((day, i) => (
              <th key={day} scope="col" className="pb-2 align-bottom">
                <span
                  className={`font-head block text-[11px] leading-none font-black tracking-[0.15em] sm:text-sm ${
                    day === todayStr ? 'text-rust' : ''
                  }`}
                >
                  {DAY_LABELS[i]}
                </span>
                <span className="font-head block text-lg leading-none font-black opacity-50">
                  {dayNumber(day)}
                </span>
              </th>
            ))}
            <th scope="col" className="w-10 pb-2 align-bottom sm:w-14">
              <span className="font-head block text-[11px] leading-none font-black tracking-[0.15em] sm:text-sm">
                TOT
              </span>
            </th>
          </tr>
        </thead>

        <tbody>
          {friends.map((friend) => {
            const isMe = friend.id === meId
            const total = days.filter((d) => shown[`${friend.id}:${d}`]?.done).length

            return (
              <tr key={friend.id} className="border-ink border-t-2">
                <th
                  scope="row"
                  className="font-head py-2 pr-2 text-left text-base leading-tight font-black tracking-wide break-words uppercase sm:text-xl"
                >
                  {friend.name}
                  {isMe && <span className="text-rust"> ◆</span>}
                </th>

                {days.map((day) => {
                  const cell = shown[`${friend.id}:${day}`] ?? EMPTY
                  const face = <Face cell={cell} isToday={day === todayStr} />

                  return (
                    <td key={day} className="p-0.5 sm:p-1">
                      {isMe && !cell.done ? (
                        <button
                          type="button"
                          onClick={() => setOpenDay(openDay === day ? null : day)}
                          aria-expanded={openDay === day}
                          aria-label={`${describe(cell)} el ${longDay(day)}. Tocá para cambiarlo`}
                          className="ink-press block w-full cursor-pointer"
                        >
                          {face}
                        </button>
                      ) : (
                        <span title={`${friend.name}: ${describe(cell)}`} className="block w-full">
                          {face}
                        </span>
                      )}
                    </td>
                  )
                })}

                <td className="p-0.5 text-center sm:p-1">
                  <span
                    className={`font-head text-2xl font-black sm:text-3xl ${
                      total === 0 ? 'opacity-25' : ''
                    }`}
                  >
                    {total}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {openDay ? (
        <div className="ink bg-paper-2 mt-4 p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-head text-2xl leading-none font-black tracking-wide uppercase">
              {longDay(openDay)}
              <span className="font-body block text-xs font-normal tracking-normal normal-case opacity-60">
                {describe(mine)}
              </span>
            </h2>
            <button
              type="button"
              onClick={() => setOpenDay(null)}
              aria-label="Cerrar"
              className="font-head text-lg leading-none font-black opacity-60"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {QUICK.map((hour) => (
              <button
                key={hour}
                type="button"
                onClick={() => save(openDay, true, hour)}
                className={`ink-flat ink-press font-head px-3 py-2 text-base font-black tracking-wide ${
                  mine.going && mine.at === hour ? 'bg-rust' : 'bg-paper-2'
                }`}
              >
                {hour}
              </button>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              const value = new FormData(event.currentTarget).get('at')
              save(openDay, true, String(value ?? '') || null)
            }}
            className="mt-4 flex flex-wrap items-end gap-3"
          >
            <label>
              <span className="font-head block text-xs font-black tracking-[0.2em] uppercase">
                Otra hora
              </span>
              <input
                name="at"
                type="time"
                defaultValue={mine.at ?? ''}
                className="field w-32 py-0.5 text-2xl"
              />
            </label>
            <button
              type="submit"
              className="ink-flat ink-press bg-paper-2 font-head px-4 py-2 text-base font-black tracking-[0.15em] uppercase"
            >
              Guardar
            </button>
          </form>

          <div className="border-ink mt-4 flex flex-wrap gap-2 border-t-2 pt-4">
            <button
              type="button"
              onClick={() => save(openDay, true, null)}
              className="ink-flat ink-press bg-paper-2 font-head px-3 py-1.5 text-sm font-black tracking-[0.15em] uppercase"
            >
              Voy, sin hora
            </button>
            <button
              type="button"
              onClick={() => save(openDay, false, null)}
              className="ink-flat ink-press bg-paper-2 font-head px-3 py-1.5 text-sm font-black tracking-[0.15em] uppercase opacity-70"
            >
              No voy
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm opacity-70">
          Tocá tus casilleros para anotarte y poner a qué hora caés. Se llenan solos cuando terminás
          una sesión.
        </p>
      )}
    </>
  )
}

function Face({ cell, isToday }: { cell: Cell; isToday: boolean }) {
  const [hh, mm] = (cell.at ?? '').split(':')

  return (
    <span
      className={`relative flex aspect-square w-full items-center justify-center border-2 ${
        cell.done
          ? 'border-ink bg-rust'
          : cell.going
            ? 'border-ink bg-paper-2'
            : isToday
              ? 'border-teal border-dashed'
              : 'border-ink/15'
      }`}
    >
      {cell.done ? (
        <>
          <Sigil
            filled
            className={`h-4 w-4 sm:h-7 sm:w-7 ${
              cell.cornaldo !== null ? '-translate-x-1 -translate-y-0.5' : ''
            }`}
          />
          {cell.cornaldo !== null && (
            <span className="font-head absolute right-1 bottom-0.5 text-[11px] leading-none font-black sm:text-sm">
              {cell.cornaldo}
            </span>
          )}
        </>
      ) : cell.going && cell.at ? (
        <span className="font-head text-teal flex flex-col items-center leading-none">
          <span className="text-[13px] font-black sm:text-xl">{hh}</span>
          {mm !== '00' && <span className="text-[8px] font-black opacity-80 sm:text-[11px]">{mm}</span>}
        </span>
      ) : cell.going ? (
        <Sigil className="text-ink h-4 w-4 sm:h-7 sm:w-7" />
      ) : (
        <span className="text-ink/25 text-xl leading-none">·</span>
      )}
    </span>
  )
}

function describe(cell: Cell): string {
  if (cell.done) return cell.cornaldo !== null ? `entrenó · cornaldo ${cell.cornaldo}` : 'entrenó'
  if (cell.going) return cell.at ? `anotado a las ${cell.at}` : 'anotado, sin hora'
  return 'sin anotar'
}
