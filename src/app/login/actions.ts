'use server'

import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { users } from '@/db/schema'
import { hashPassword, verifyPassword } from '@/lib/password'
import { createSession } from '@/lib/session'

export type AuthState = { error?: string }

const MIN_PASSWORD = 8

function normalizeEmail(value: FormDataEntryValue | null) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

/** A dónde mandar después de entrar: si venía de una invitación, a aceptarla. */
function destination(formData: FormData) {
  const code = String(formData.get('invitacion') ?? '').trim()
  return code ? `/invitacion/${encodeURIComponent(code)}` : '/'
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = normalizeEmail(formData.get('email'))
  const password = String(formData.get('password') ?? '')

  const [user] = await db.select().from(users).where(eq(users.email, email))

  // Mismo mensaje para email inexistente y contraseña mala: no confirma quién tiene cuenta.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: 'Email o contraseña incorrectos.' }
  }

  await createSession(user.id)
  redirect(destination(formData))
}

export async function register(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = normalizeEmail(formData.get('email'))
  const password = String(formData.get('password') ?? '')
  const name = String(formData.get('name') ?? '').trim()

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Ese email no parece válido.' }
  if (name.length < 2) return { error: 'Escribí el nombre con el que querés que te vean.' }
  if (password.length < MIN_PASSWORD) {
    return { error: `La contraseña necesita al menos ${MIN_PASSWORD} caracteres.` }
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email))
  if (existing) return { error: 'Ya hay una cuenta con ese email. Entrá desde acá.' }

  const [user] = await db
    .insert(users)
    .values({ email, name, passwordHash: await hashPassword(password) })
    .returning({ id: users.id })

  await createSession(user.id)
  redirect(destination(formData))
}
