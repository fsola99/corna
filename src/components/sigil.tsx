/**
 * El emblema de CORNA: dos astas enroscadas sobre un yunque, con una semilla
 * en el medio. Es la marca de la escala cornaldo.
 */
export function Sigil({ filled = false, className = '' }: { filled?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 19.5C6.5 16.5 4 13 4.5 9 5 5 8.5 3 11 4.8c2.2 1.6 1.6 4.6-.8 4.8" />
      <path d="M21 19.5c4.5-3 7-6.5 6.5-10.5C27 5 23.5 3 21 4.8c-2.2 1.6-1.6 4.6.8 4.8" />
      <path d="M16 7.5 18.4 12 16 16.5 13.6 12Z" fill={filled ? 'currentColor' : 'none'} />
      <path
        d="M10 20.5 16 17.5l6 3v3.5c0 3.6-2.6 6.3-6 7-3.4-.7-6-3.4-6-7Z"
        fill={filled ? 'currentColor' : 'none'}
      />
    </svg>
  )
}
