'use client'

import { useActionState } from 'react'
import { changePassword, renameMe, type AccountState } from './actions'

export function AccountForms({ name, email }: { name: string; email: string }) {
  const [nameState, rename, renaming] = useActionState<AccountState, FormData>(renameMe, {})
  const [passState, changePass, changing] = useActionState<AccountState, FormData>(
    changePassword,
    {},
  )

  return (
    <div className="mt-8 space-y-5">
      <form action={rename} className="ink bg-paper p-5">
        <h2 className="font-head text-xl font-black tracking-wide uppercase">Tu nombre</h2>
        <p className="mt-1 mb-3 text-sm opacity-70">
          Así te ven en la grilla. Cambiarlo no toca tus rutinas ni tu historial.
        </p>
        <div className="flex flex-wrap gap-3">
          <input
            name="name"
            defaultValue={name}
            required
            maxLength={24}
            aria-label="Tu nombre"
            className="field min-w-44 flex-1 py-1 text-xl"
          />
          <button
            type="submit"
            disabled={renaming}
            className="ink-flat ink-press bg-paper font-head px-4 py-2.5 text-base font-black tracking-[0.15em] uppercase disabled:opacity-60"
          >
            Guardar
          </button>
        </div>
        <Feedback state={nameState} />
      </form>

      <div className="ink bg-paper p-5">
        <h2 className="font-head text-xl font-black tracking-wide uppercase">Email</h2>
        <p className="mt-1 text-sm opacity-70">
          Con este entrás. Es fijo: la cuenta se identifica por acá.
        </p>
        <p className="font-head mt-2 text-lg font-black">{email}</p>
      </div>

      <form action={changePass} className="ink bg-paper p-5">
        <h2 className="font-head text-xl font-black tracking-wide uppercase">Contraseña</h2>
        <div className="mt-3 space-y-4">
          <label className="block">
            <span className="font-head block text-sm font-bold tracking-[0.2em] uppercase">
              La actual
            </span>
            <input
              name="current"
              type="password"
              required
              autoComplete="current-password"
              className="field mt-1 w-full py-1 text-lg"
            />
          </label>
          <label className="block">
            <span className="font-head block text-sm font-bold tracking-[0.2em] uppercase">
              La nueva
            </span>
            <input
              name="next"
              type="password"
              required
              autoComplete="new-password"
              className="field mt-1 w-full py-1 text-lg"
            />
            <span className="mt-1 block text-center text-xs opacity-60">Mínimo 8 caracteres.</span>
          </label>
        </div>
        <button
          type="submit"
          disabled={changing}
          className="ink-flat ink-press bg-paper font-head mt-4 px-4 py-2.5 text-base font-black tracking-[0.15em] uppercase disabled:opacity-60"
        >
          Cambiar
        </button>
        <Feedback state={passState} />
      </form>
    </div>
  )
}

function Feedback({ state }: { state: AccountState }) {
  if (!state.error && !state.ok) return null
  return (
    <p
      aria-live="polite"
      className={`font-head mt-3 border-2 px-3 py-2 text-sm font-bold tracking-wide uppercase ${
        state.error ? 'border-ink bg-pink' : 'border-ink bg-paper-2'
      }`}
    >
      {state.error ?? state.ok}
    </p>
  )
}
