import type { Exercise } from '@/db/schema'

/**
 * El catálogo agrupado por zona. `firstZone` sube una zona al tope, que es de
 * donde salen los reemplazos razonables cuando una máquina está ocupada.
 */
export function ExerciseSelect({
  catalog,
  label,
  name = 'exerciseId',
  className = '',
  firstZone,
  exclude,
}: {
  catalog: Exercise[]
  label: string
  name?: string
  className?: string
  firstZone?: string
  exclude?: number
}) {
  const usable = catalog.filter((exercise) => exercise.id !== exclude)
  const all = [...new Set(usable.map((exercise) => exercise.zone))]
  const zones = all.includes(firstZone ?? '')
    ? [firstZone as string, ...all.filter((zone) => zone !== firstZone)]
    : all

  return (
    <select
      name={name}
      aria-label={label}
      className={`ink-flat bg-paper-2 font-head px-3 py-2.5 text-base font-black tracking-wide uppercase ${className}`}
    >
      {zones.map((zone) => (
        <optgroup key={zone} label={zone === firstZone ? `${zone} · misma zona` : zone}>
          {usable
            .filter((exercise) => exercise.zone === zone)
            .map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.name}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  )
}
