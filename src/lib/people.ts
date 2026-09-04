/**
 * Una tinta por persona, repartida en el orden en que entraron al grupo: es lo
 * que permite leer el calendario sin leer los nombres.
 *
 * Están elegidas contra la paleta de la web —cobre, verdín, musgo, bronce y la
 * tinta clara— y contra sí mismas: ninguna queda a menos de 0.16 en OKLab de
 * otra tinta ni de un color de la interfaz, y todas superan 3.5:1 de contraste
 * sobre el papel oscuro. Por eso son frías y saturadas: los cálidos apagados
 * —naranja, oro, oliva— son justamente los de la web, y ahí se mezclarían.
 *
 * El orden no es decorativo: las primeras son las más separadas entre sí, así
 * un grupo de tres o cuatro arranca con las tintas más distintas del juego.
 */
const TINTS = [
  '#d5e30d', // lima
  '#9235fe', // violeta
  '#fd7db1', // rosa
  '#34d1f9', // celeste
  '#fc17fd', // magenta
  '#d61678', // frambuesa
  '#7d649c', // malva
  '#0065f1', // azul
  '#11faba', // verde agua
  '#8295fb', // lila
] as const

/** Un color CSS: va a `--tint`, no a una clase de Tailwind. */
export type Tint = (typeof TINTS)[number]

/** Cuánta gente entra en un grupo: hay exactamente una tinta para cada uno. */
export const MAX_MEMBERS = TINTS.length

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
