export type Point = { day: string; value: number; reps: number; sets: number }

const W = 720
const H = 250
const PAD = { top: 26, right: 22, bottom: 34, left: 46 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

/** Cortes redondos que encierran el rango, para que la escala se lea de un vistazo. */
function ticks(min: number, max: number): number[] {
  const span = max - min || Math.max(max, 1)
  const raw = span / 3
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? magnitude * 10
  const start = Math.floor(min / step) * step
  const out: number[] = []
  for (let v = start; v <= max + step / 2; v += step) out.push(Number(v.toFixed(4)))
  return out
}

function shortDay(day: string): string {
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${day}T12:00:00Z`),
  )
}

/**
 * Evolución de la mejor serie de un ejercicio. Una sola serie de datos, así que
 * el título alcanza como identificación y no lleva leyenda.
 */
export function ProgressChart({
  points,
  unit,
  title,
}: {
  points: Point[]
  unit: string
  title: string
}) {
  const values = points.map((p) => p.value)
  const grid = ticks(Math.min(...values), Math.max(...values))
  const yMin = grid[0]
  const yMax = grid[grid.length - 1]

  const times = points.map((p) => new Date(`${p.day}T12:00:00Z`).getTime())
  const tSpan = times[times.length - 1] - times[0]
  const x = (i: number) =>
    PAD.left + (tSpan > 0 ? ((times[i] - times[0]) / tSpan) * PLOT_W : (i / (points.length - 1)) * PLOT_W)
  const y = (value: number) => PAD.top + PLOT_H - ((value - yMin) / (yMax - yMin || 1)) * PLOT_H

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ')
  const best = values.indexOf(Math.max(...values))
  const last = points.length - 1
  // Punto de partida, techo y estado actual: el resto lo cuenta el eje y el hover.
  const labelled = new Set([0, best, last])

  return (
    <figure className="m-0">
      <figcaption className="font-head text-xl leading-none font-black tracking-wide uppercase">
        {title}
        <span className="font-body ml-2 text-xs font-normal tracking-normal normal-case opacity-60">
          mejor serie de cada sesión, en {unit}
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 h-auto w-full"
        role="img"
        aria-label={`Evolución de ${title}: de ${values[0]} a ${values[last]} ${unit}.`}
      >
        {grid.map((value) => (
          <g key={value}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(value)}
              y2={y(value)}
              stroke="currentColor"
              strokeOpacity={0.14}
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(value) + 4}
              textAnchor="end"
              className="font-head fill-current text-[13px] font-black opacity-45"
            >
              {value}
            </text>
          </g>
        ))}

        <path d={path} fill="none" stroke="var(--color-teal)" strokeWidth={2} strokeLinejoin="round" />

        {points.map((point, i) => (
          <g key={point.day + i}>
            <circle cx={x(i)} cy={y(point.value)} r={5} fill="var(--color-teal)" stroke="var(--color-paper)" strokeWidth={2}>
              <title>{`${shortDay(point.day)} · ${point.value} ${unit} × ${point.reps} reps · ${point.sets} series`}</title>
            </circle>
            {labelled.has(i) && (
              <text
                x={x(i)}
                y={y(point.value) - 13}
                textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'}
                className="font-head fill-current text-[15px] font-black"
              >
                {point.value}
              </text>
            )}
          </g>
        ))}

        <text x={PAD.left} y={H - 10} className="font-head fill-current text-[13px] font-black opacity-55">
          {shortDay(points[0].day)}
        </text>
        {points.length > 1 && (
          <text
            x={W - PAD.right}
            y={H - 10}
            textAnchor="end"
            className="font-head fill-current text-[13px] font-black opacity-55"
          >
            {shortDay(points[last].day)}
          </text>
        )}
      </svg>
    </figure>
  )
}
