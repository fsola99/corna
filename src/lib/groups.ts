import { and, asc, eq, gt, isNull } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { groups, invites, memberships, users, type Group } from '@/db/schema'
import { MAX_MEMBERS } from '@/lib/people'

const GROUP_COOKIE = 'corna_group'
const INVITE_DAYS = 7

export { MAX_MEMBERS }

export async function myGroups(userId: number): Promise<Group[]> {
  return db
    .select({
      id: groups.id,
      name: groups.name,
      ownerId: groups.ownerId,
      createdAt: groups.createdAt,
    })
    .from(memberships)
    .innerJoin(groups, eq(groups.id, memberships.groupId))
    .where(eq(memberships.userId, userId))
    .orderBy(asc(groups.id))
}

/** El grupo activo según la cookie, validado contra las membresías. */
export async function activeGroup(userId: number): Promise<Group | null> {
  const mine = await myGroups(userId)
  if (mine.length === 0) return null

  const preferred = Number((await cookies()).get(GROUP_COOKIE)?.value)
  return mine.find((group) => group.id === preferred) ?? mine[0]
}

/** El grupo activo, o manda a crear el primero. */
export async function requireGroup(userId: number): Promise<Group> {
  const group = await activeGroup(userId)
  if (!group) redirect('/grupo/nuevo')
  return group
}

/** Sólo desde una Server Action: escribir cookies durante el render no está permitido. */
export async function setActiveGroup(groupId: number) {
  const jar = await cookies()
  jar.set(GROUP_COOKIE, String(groupId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })
}

export async function groupMembers(groupId: number) {
  return db
    .select({ id: users.id, name: users.name, email: users.email, joinedAt: memberships.joinedAt })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.groupId, groupId))
    .orderBy(asc(memberships.joinedAt), asc(users.id))
}

/** Cuánta gente hay adentro. Nunca pasa de `MAX_MEMBERS`. */
export async function memberCount(groupId: number): Promise<number> {
  const rows = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(eq(memberships.groupId, groupId))
  return rows.length
}

/**
 * Mete a alguien al grupo y devuelve si entró. Devuelve falso sólo cuando el
 * grupo está completo; volver a entrar a uno en el que ya está no es un error.
 *
 * El cupo se vuelve a contar después de insertar porque la base se consulta por
 * HTTP, sin transacciones: si dos entran a la vez y el grupo se pasa de diez,
 * el que quedó afuera del cupo se da de baja solo.
 */
export async function joinGroup(groupId: number, userId: number): Promise<boolean> {
  if (await isMember(groupId, userId)) return true

  await db.insert(memberships).values({ groupId, userId }).onConflictDoNothing()

  const members = await groupMembers(groupId)
  const place = members.findIndex((member) => member.id === userId) + 1
  if (place > 0 && place <= MAX_MEMBERS) return true

  await db
    .delete(memberships)
    .where(and(eq(memberships.groupId, groupId), eq(memberships.userId, userId)))
  return false
}

export async function isMember(groupId: number, userId: number): Promise<boolean> {
  const [row] = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.groupId, groupId), eq(memberships.userId, userId)))
  return Boolean(row)
}

/** La invitación vigente del grupo, si hay alguna sin vencer ni revocar. */
export async function activeInvite(groupId: number) {
  const [invite] = await db
    .select()
    .from(invites)
    .where(
      and(
        eq(invites.groupId, groupId),
        isNull(invites.revokedAt),
        gt(invites.expiresAt, new Date()),
      ),
    )
    .orderBy(asc(invites.id))
    .limit(1)
  return invite ?? null
}

export async function createInvite(groupId: number, userId: number) {
  const [invite] = await db
    .insert(invites)
    .values({
      groupId,
      createdBy: userId,
      code: randomBytes(9).toString('base64url'),
      expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000),
    })
    .returning()
  return invite
}
