/**
 * La escala con la que se puntúa una sesión terminada. Cada escalón tiene su
 * tinta, de fría a incandescente: `tone` la pinta maciza y `mark` sólo el trazo.
 */
export const CORNALDO = [
  { value: 1, label: 'vine a mirar el techo', tone: 'bg-teal', mark: 'text-teal' },
  { value: 2, label: 'tibio', tone: 'bg-teal', mark: 'text-teal' },
  { value: 3, label: 'cumplí', tone: 'bg-moss', mark: 'text-moss' },
  { value: 4, label: 'me prendí fuego', tone: 'bg-rust', mark: 'text-rust' },
  { value: 5, label: 'CORNALDO TOTAL', tone: 'bg-brass', mark: 'text-brass' },
] as const

export function cornaldoLabel(value: number | null): string {
  return CORNALDO.find((c) => c.value === value)?.label ?? ''
}

/** El color del trazo del escalón, para mostrar un puntaje ya cerrado. */
export function cornaldoMark(value: number | null): string {
  return CORNALDO.find((c) => c.value === value)?.mark ?? 'text-ink'
}
