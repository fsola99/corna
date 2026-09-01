/** El glifo de la escala cornaldo: dos cuernos sobre un puño. */
export function Horns({ filled = false, className = '' }: { filled?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 17V3" />
      <path d="M22 17V3" />
      <rect x="6" y="16" width="20" height="12" rx="4" fill={filled ? 'currentColor' : 'none'} />
    </svg>
  )
}
