import { atOfSlot, slotOf } from './week'

export type Slot = { userId: number; day: string; startAt: string | null; endAt: string | null }

/**
 * Un cruce: el tramo en el que dos o más personas están en el gimnasio al mismo
 * tiempo. Un turno de 19:30 a 21:00 y otro de 20:00 a 22:00 se cruzan de 20:00
 * a 21:00, y eso es lo que dice el cruce: el rato compartido, no la hora en que
 * arrancó cada uno.
 */
export type Meetup = { day: string; startAt: string; endAt: string; userIds: number[] }

/** Los cruces que hay entre lo anotado, en orden de día y hora. */
export function meetups(slots: Slot[]): Meetup[] {
  const byDay = new Map<string, { userId: number; from: number; to: number }[]>()

  for (const slot of slots) {
    if (!slot.startAt || !slot.endAt) continue
    const from = slotOf(slot.startAt)
    const to = slotOf(slot.endAt)
    if (to <= from) continue
    byDay.set(slot.day, [...(byDay.get(slot.day) ?? []), { userId: slot.userId, from, to }])
  }

  const found: Meetup[] = []

  for (const [day, turns] of byDay) {
    const first = Math.min(...turns.map((turn) => turn.from))
    const last = Math.max(...turns.map((turn) => turn.to))
    let open: { userIds: number[]; from: number } | null = null

    const close = (to: number) => {
      if (open) found.push({ day, startAt: atOfSlot(open.from), endAt: atOfSlot(to), userIds: open.userIds })
      open = null
    }

    for (let slot = first; slot < last; slot++) {
      const here = turns
        .filter((turn) => turn.from <= slot && slot < turn.to)
        .map((turn) => turn.userId)
        .sort((a, b) => a - b)

      if (here.length < 2) {
        close(slot)
        continue
      }
      if (!open || open.userIds.join() !== here.join()) {
        close(slot)
        open = { userIds: here, from: slot }
      }
    }
    close(last)
  }

  return found.sort((a, b) => a.day.localeCompare(b.day) || a.startAt.localeCompare(b.startAt))
}
