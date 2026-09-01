/** La escala con la que se puntúa una sesión terminada. */
export const CORNALDO = [
  { value: 1, label: 'vine a mirar el techo' },
  { value: 2, label: 'tibio' },
  { value: 3, label: 'cumplí' },
  { value: 4, label: 'me prendí fuego' },
  { value: 5, label: 'CORNALDO TOTAL' },
] as const

export function cornaldoLabel(value: number | null): string {
  return CORNALDO.find((c) => c.value === value)?.label ?? ''
}
