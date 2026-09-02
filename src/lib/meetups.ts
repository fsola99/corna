import { hourSlot } from './week'

export type Slot = { userId: number; day: string; at: string | null }

/** Un cruce: dos o más personas anotadas el mismo día en la misma franja. */
export type Meetup = { day: string; hour: string; userIds: number[] }

/** Los cruces que hay entre lo anotado, en orden de día y hora. */
export function meetups(slots: Slot[]): Meetup[] {
  const byCell = new Map<string, number[]>()

  for (const slot of slots) {
    const hour = hourSlot(slot.at)
    if (!hour) continue
    const key = `${slot.day} ${hour}`
    byCell.set(key, [...(byCell.get(key) ?? []), slot.userId])
  }

  return [...byCell]
    .filter(([, userIds]) => userIds.length > 1)
    .map(([key, userIds]) => {
      const [day, hour] = key.split(' ')
      return { day, hour, userIds }
    })
    .sort((a, b) => a.day.localeCompare(b.day) || a.hour.localeCompare(b.hour))
}
