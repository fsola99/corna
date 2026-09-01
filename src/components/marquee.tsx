/** Cinta de datos reales de la semana. Se duplica para que el loop no corte. */
export function Marquee({ items }: { items: string[] }) {
  if (items.length === 0) return null
  const run = [...items, ...items]

  return (
    <div className="overflow-hidden border-y-2 border-ink bg-blue py-1.5">
      <div className="marquee-track flex w-max whitespace-nowrap">
        {run.map((item, i) => (
          <span
            key={i}
            className="font-head text-[15px] font-black tracking-[0.18em] text-paper uppercase"
          >
            {item}
            <span className="px-4 text-pink">◆</span>
          </span>
        ))}
      </div>
    </div>
  )
}
