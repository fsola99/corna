import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SignJWT, jwtVerify } from 'jose'
import { db } from '@/db'
import { users, type User } from '@/db/schema'

const COOKIE = 'corna_session'
const MAX_AGE = 60 * 60 * 24 * 365

function key() {
  return new TextEncoder().encode(process.env.AUTH_SECRET!)
}

/** La cookie guarda sólo el id: el nombre se lee de la base y puede cambiar. */
export async function createSession(userId: number) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key())

  const jar = await cookies()
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE,
    path: '/',
  })
}

async function sessionUserId(): Promise<number | null> {
  const token = (await cookies()).get(COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] })
    return typeof payload.userId === 'number' ? payload.userId : null
  } catch {
    return null
  }
}

export async function currentUser(): Promise<User | null> {
  const userId = await sessionUserId()
  if (userId === null) return null

  const [user] = await db.select().from(users).where(eq(users.id, userId))
  return user ?? null
}

/** Devuelve el usuario logueado o redirige a /login. */
export async function requireUser(): Promise<User> {
  const user = await currentUser()
  if (!user) redirect('/login')
  return user
}

export async function destroySession() {
  const jar = await cookies()
  jar.delete(COOKIE)
  jar.delete('corna_group')
}
