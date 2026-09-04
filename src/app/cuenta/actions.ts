'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { users } from '@/db/schema'
import { hashPassword, verifyPassword } from '@/lib/password'
import { requireUser } from '@/lib/session'

export type AccountState = { error?: string; ok?: string }

const MIN_PASSWORD = 8

/** Cambia sólo cómo te ven: la cuenta sigue siendo la misma. */
export async function renameMe(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const user = await requireUser()
  const name = String(formData.get('name') ?? '').trim()
  if (name.length < 2) return { error: 'El nombre necesita al menos 2 caracteres.' }

  await db.update(users).set({ name }).where(eq(users.id, user.id))
  revalidatePath('/', 'layout')
  return { ok: `Ahora te ven como ${name}.` }
}

export async function changePassword(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const user = await requireUser()
  const current = String(formData.get('current') ?? '')
  const next = String(formData.get('next') ?? '')

  if (!(await verifyPassword(current, user.passwordHash))) {
    return { error: 'La contraseña actual no coincide.' }
  }
  if (next.length < MIN_PASSWORD) {
    return { error: `La nueva necesita al menos ${MIN_PASSWORD} caracteres.` }
  }

  await db.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, user.id))
  return { ok: 'Contraseña cambiada.' }
}
