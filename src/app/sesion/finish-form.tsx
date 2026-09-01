'use client'

import { useState } from 'react'
import { Horns } from '@/components/horns'
import { CORNALDO } from '@/lib/cornaldo'
import { finishSession } from './actions'

export function FinishForm() {
  const [score, setScore] = useState(0)
  const label = CORNALDO.find((c) => c.value === score)?.label

  return (
    <form action={finishSession} className="ink bg-paper p-5 sm:p-7">
      <h2 className="font-head text-2xl leading-none font-black tracking-wide uppercase sm:text-3xl">
        ¿Cómo te sentiste?
      </h2>
      <p className="mt-1 text-sm opacity-70">Escala cornaldo, del 1 al 5.</p>

      <fieldset className="mt-4">
        <legend className="sr-only">Cornaldo</legend>
        <div className="flex flex-wrap gap-2">
          {CORNALDO.map((step) => (
            <label
              key={step.value}
              className={`ink-flat ink-press flex h-14 w-14 cursor-pointer items-center justify-center ${
                score >= step.value ? 'bg-pink' : 'bg-paper'
              }`}
            >
              <input
                type="radio"
                name="cornaldo"
                value={step.value}
                checked={score === step.value}
                onChange={() => setScore(step.value)}
                className="sr-only"
              />
              <span className="sr-only">
                {step.value} · {step.label}
              </span>
              <Horns filled={score >= step.value} className="h-7 w-7" />
            </label>
          ))}
        </div>

        <p
          className="font-head mt-3 min-h-8 text-2xl leading-none font-black tracking-wide uppercase"
          aria-live="polite"
        >
          {label ?? <span className="opacity-30">elegí una</span>}
        </p>
      </fieldset>

      <label className="mt-5 block">
        <span className="font-head block text-sm font-bold tracking-[0.2em] uppercase">
          Nota (opcional)
        </span>
        <input
          name="note"
          maxLength={140}
          placeholder="Me quedé sin banco, hice press con mancuernas"
          className="field mt-1 w-full py-1 text-left text-lg"
        />
      </label>

      <button
        type="submit"
        disabled={score === 0}
        className="ink-sm ink-press bg-pink font-display mt-6 w-full py-4 text-xl disabled:opacity-40"
      >
        Cerrar la sesión
      </button>
    </form>
  )
}
