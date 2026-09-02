'use client'

import { useState } from 'react'
import { Sigil } from '@/components/sigil'
import { CORNALDO } from '@/lib/cornaldo'

/**
 * La escala del 1 al 5 como campo de formulario. Volver a tocar el escalón
 * elegido lo desmarca, así se puede guardar una sesión sin puntuar.
 */
export function CornaldoPicker({
  name = 'cornaldo',
  defaultValue = 0,
  onChange,
}: {
  name?: string
  defaultValue?: number | null
  onChange?: (score: number) => void
}) {
  const [score, setScore] = useState(defaultValue ?? 0)
  const label = CORNALDO.find((c) => c.value === score)?.label

  const pick = (value: number) => {
    const next = score === value ? 0 : value
    setScore(next)
    onChange?.(next)
  }

  return (
    <fieldset>
      <legend className="sr-only">Cornaldo</legend>
      <input type="hidden" name={name} value={score} />

      <div className="flex flex-wrap gap-2">
        {CORNALDO.map((step) => (
          <button
            key={step.value}
            type="button"
            onClick={() => pick(step.value)}
            aria-pressed={score === step.value}
            aria-label={`${step.value} · ${step.label}`}
            className={`ink-flat ink-press flex h-14 w-14 cursor-pointer items-center justify-center ${
              score >= step.value ? step.tone : 'bg-paper-2'
            }`}
          >
            <Sigil filled={score >= step.value} className="h-7 w-7" />
          </button>
        ))}
      </div>

      <p
        className="font-head mt-3 min-h-8 text-2xl leading-none font-black tracking-wide uppercase"
        aria-live="polite"
      >
        {label ?? <span className="opacity-30">sin puntuar</span>}
      </p>
    </fieldset>
  )
}
