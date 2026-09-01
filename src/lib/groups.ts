import { and, asc, eq, gt, isNull } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { groups, invites, memberships, users, type Group } from '@/db/schema'

const GROUP_COOKIE = 'corna_group'
const INVITE_DAYS = 7

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
