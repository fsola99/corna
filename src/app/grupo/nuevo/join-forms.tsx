'use client'

import { useActionState } from 'react'
import { createGroup, joinWithCode, type GroupState } from '../actions'

export function JoinForms() {
  const [createState, create, creating] = useActionState<GroupState, FormData>(createGroup, {})
  const [joinState, join, joining] = useActionState<GroupState, FormData>(joinWithCode, {})

  return (
    <div className="space-y-5">
      <form action={create} className="ink bg-paper p-5">
        <h2 className="font-head text-xl font-black tracking-wide uppercase">Crear un grupo</h2>
        <p className="mt-1 mb-3 text-sm opacity-70">Quedás como dueño y podés invitar al resto.</p>
        <div className="flex flex-wrap gap-3">
          <input
            name="name"
            required
            maxLength={40}
            placeholder="Los Fierros"
            aria-label="Nombre del grupo"
            className="field min-w-44 flex-1 py-1 text-xl"
          />
          <button
            type="submit"
            disabled={creating}
            className="ink-sm ink-press bg-pink font-display px-5 py-3 text-base disabled:opacity-60"
          >
            {creating ? 'Creando…' : 'Crear'}
          </button>
        </div>
        {createState.error && <Error>{createState.error}</Error>}
      </form>

      <form action={join} className="ink bg-paper p-5">
        <h2 className="font-head text-xl font-black tracking-wide uppercase">Entrar con un link</h2>
        <p className="mt-1 mb-3 text-sm opacity-70">Pegá el link o el código que te pasaron.</p>
        <div className="flex flex-wrap gap-3">
          <input
            name="code"
            required
            placeholder="https://…/invitacion/xxxx"
            aria-label="Link o código de invitación"
            className="field min-w-44 flex-1 py-1 text-base"
          />
          <button
            type="submit"
            disabled={joining}
            className="ink-flat ink-press bg-paper font-head px-5 py-3 text-base font-black tracking-[0.15em] uppercase disabled:opacity-60"
          >
            {joining ? 'Entrando…' : 'Entrar'}
          </button>
        </div>
        {joinState.error && <Error>{joinState.error}</Error>}
      </form>
    </div>
  )
}

function Error({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-ink bg-pink font-head mt-3 border-2 px-3 py-2 text-sm font-bold tracking-wide uppercase">
      {children}
    </p>
  )
}
