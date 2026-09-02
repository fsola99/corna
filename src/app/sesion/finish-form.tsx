'use client'

import { useState } from 'react'
import { CornaldoPicker } from '@/components/cornaldo-picker'
import { finishSession } from './actions'
import { Elapsed } from './elapsed'

/**
 * El cierre de la sesión: la escala arriba y, pegada al borde de la pantalla,
 * la barra que la termina entera de un toque. Lo que quedó pendiente se cierra
 * solo, así no hace falta pasar ejercicio por ejercicio.
 */
export function FinishForm({ startedAt, sets }: { startedAt: string; sets: number }) {
  const [score, setScore] = useState(0)

  return (
    <>
      <form id="cerrar" action={finishSession} className="ink bg-paper-2 p-5 sm:p-7">
        <h2 className="font-head text-2xl leading-none font-black tracking-wide uppercase sm:text-3xl">
          ¿Cómo te sentiste?
        </h2>
        <p className="mt-1 mb-4 text-sm opacity-70">
          Escala cornaldo, del 1 al 5. Es opcional: podés cerrar sin puntuar.
        </p>

        <CornaldoPicker onChange={setScore} />

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
      </form>

      <div className="border-ink bg-paper-2 fixed inset-x-0 bottom-0 z-40 border-t-2">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <p className="font-head text-lg leading-none font-black tracking-[0.15em] uppercase">
            <Elapsed since={startedAt} />
            <span className="font-body block text-xs font-normal tracking-normal normal-case opacity-60">
              {sets === 0 ? 'sin series' : `${sets} ${sets === 1 ? 'serie' : 'series'}`}
              {score === 0 ? ' · sin puntuar' : ''}
            </span>
          </p>

          <button
            type="submit"
            form="cerrar"
            className="ink-sm ink-press bg-rust font-display shrink-0 px-6 py-3 text-base"
          >
            Terminar
          </button>
        </div>
      </div>
    </>
  )
}
