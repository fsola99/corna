'use client'

import { useOptimistic, useTransition } from 'react'
import { Horns } from '@/components/horns'
import { DAY_LABELS, dayNumber } from '@/lib/week'
import { toggleAttendance } from './actions'

export type Cell = { going: boolean; done: boolean; cornaldo: number | null }
export type Cells = Record<string, Cell>

const EMPTY: Cell = { going: false, done: false, cornaldo: null }

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
  const [shown, toggle] = useOptimistic(cells, (state: Cells, key: string) => {
    const cell = state[key] ?? EMPTY
    return { ...state, [key]: { ...cell, going: !cell.going } }
  })

  const onToggle = (day: string) => {
    const key = `${meId}:${day}`
    startTransition(async () => {
      toggle(key)
      await toggleAttendance(day)
    })
  }

  return (
    <table className="w-full table-fixed border-collapse">
      <thead>
        <tr>
          <th className="w-16 sm:w-28" />
          {days.map((day, i) => (
            <th key={day} scope="col" className="pb-2 align-bottom">
              <span
                className={`font-head block text-[11px] leading-none font-black tracking-[0.15em] sm:text-sm ${
                  day === todayStr ? 'text-pink' : ''
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
          const mine = friend.id === meId
          const total = days.filter((d) => shown[`${friend.id}:${d}`]?.done).length

          return (
            <tr key={friend.id} className="border-ink border-t-2">
              <th
                scope="row"
                className="font-head py-2 pr-2 text-left text-base leading-tight font-black tracking-wide break-words uppercase sm:text-xl"
              >
                {friend.name}
                {mine && <span className="text-pink"> ◆</span>}
              </th>

              {days.map((day) => {
                const cell = shown[`${friend.id}:${day}`] ?? EMPTY
                const isToday = day === todayStr
                const label = cell.done
                  ? `${friend.name} entrenó`
                  : cell.going
                    ? `${friend.name} anotado`
                    : `${friend.name} sin anotar`

                const face = (
                  <span
                    className={`relative flex aspect-square w-full items-center justify-center border-2 ${
                      cell.done
                        ? 'border-ink bg-pink'
                        : cell.going
                          ? 'border-ink bg-paper'
                          : isToday
                            ? 'border-blue border-dashed'
                            : 'border-ink/15'
                    }`}
                  >
                    {cell.done ? (
                      <>
                        <Horns
                          filled
                          className={`text-ink h-4 w-4 sm:h-7 sm:w-7 ${
                            cell.cornaldo !== null ? '-translate-x-1 -translate-y-0.5' : ''
                          }`}
                        />
                        {cell.cornaldo !== null && (
                          <span className="font-head absolute right-1 bottom-0.5 text-[11px] leading-none font-black sm:text-sm">
                            {cell.cornaldo}
                          </span>
                        )}
                      </>
                    ) : cell.going ? (
                      <Horns className="text-ink h-4 w-4 sm:h-7 sm:w-7" />
                    ) : (
                      <span className="text-ink/25 text-xl leading-none">·</span>
                    )}
                  </span>
                )

                return (
                  <td key={day} className="p-0.5 sm:p-1">
                    {mine && !cell.done ? (
                      <button
                        type="button"
                        onClick={() => onToggle(day)}
                        disabled={pending}
                        aria-pressed={cell.going}
                        aria-label={`${cell.going ? 'Desanotarme' : 'Anotarme'} el ${day}`}
                        className="ink-press block w-full cursor-pointer"
                      >
                        {face}
                      </button>
                    ) : (
                      <span title={label} className="block w-full">
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
  )
}
