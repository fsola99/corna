/**
 * Una tinta por persona, repartida en el orden en que entraron al grupo: es lo
 * que permite leer el calendario sin leer los nombres. Las clases van escritas
 * enteras porque Tailwind las busca en el código, no las arma en tiempo de uso.
 */
const TINTS = [
  { solid: 'bg-rust border-rust', ghost: 'text-rust border-rust' },
  { solid: 'bg-teal border-teal', ghost: 'text-teal border-teal' },
  { solid: 'bg-moss border-moss', ghost: 'text-moss border-moss' },
  { solid: 'bg-brass border-brass', ghost: 'text-brass border-brass' },
  { solid: 'bg-ink border-ink', ghost: 'text-ink border-ink' },
] as const

export type Tint = (typeof TINTS)[number]

export function tintOf(index: number): Tint {
  return TINTS[index % TINTS.length]
}

/** Dos letras para el casillero: iniciales del nombre, o las dos primeras. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '??'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}
