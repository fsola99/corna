'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { login, register, type AuthState } from './actions'

export function AuthForm({ mode, invite }: { mode: 'login' | 'register'; invite?: string }) {
  const isRegister = mode === 'register'
  const [state, action, pending] = useActionState<AuthState, FormData>(
    isRegister ? register : login,
    {},
  )

  return (
    <form action={action} className="ink bg-paper w-full max-w-md">
      <div className="border-ink bg-blue text-paper flex items-baseline justify-between border-b-2 px-4 py-2">
        <span className="font-head text-lg font-black tracking-[0.25em] uppercase">
          {isRegister ? 'Alta de socio' : 'Ficha de socio'}
        </span>
        <span className="font-head text-pink text-lg font-black">Nº ____</span>
      </div>

      <div className="space-y-6 px-6 py-8">
        {invite && <input type="hidden" name="invitacion" value={invite} />}

        {isRegister && (
          <Field
            label="Tu nombre"
            name="name"
            autoComplete="name"
            maxLength={24}
            placeholder="Fede"
          />
        )}

        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="vos@ejemplo.com"
        />

        <Field
          label="Contraseña"
          name="password"
          type="password"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          placeholder="· · · · · · · ·"
          hint={isRegister ? 'Mínimo 8 caracteres.' : undefined}
        />

        {state.error && (
          <p className="border-ink bg-pink font-head border-2 px-3 py-2 text-base font-bold tracking-wide uppercase">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="ink-sm ink-press bg-pink font-display w-full py-4 text-xl disabled:opacity-60"
        >
          {pending ? 'Un segundo…' : isRegister ? 'Crear cuenta' : 'Entrar'}
        </button>

        <p className="text-center text-sm">
          {isRegister ? '¿Ya tenés cuenta? ' : '¿Primera vez? '}
          <Link
            href={
              (isRegister ? '/login' : '/registro') +
              (invite ? `?i=${encodeURIComponent(invite)}` : '')
            }
            className="font-head font-bold tracking-widest uppercase underline decoration-pink decoration-2 underline-offset-4"
          >
            {isRegister ? 'Entrar' : 'Crear cuenta'}
          </Link>
        </p>
      </div>
    </form>
  )
}

function Field({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & React.ComponentProps<'input'>) {
  return (
    <label className="block">
      <span className="font-head block text-sm font-bold tracking-[0.2em] uppercase">{label}</span>
      <input {...props} required className="field mt-1 w-full py-1 text-xl" />
      {hint && <span className="mt-1 block text-center text-xs opacity-60">{hint}</span>}
    </label>
  )
}
