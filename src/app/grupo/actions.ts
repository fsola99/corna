'use server'

import { and, eq, gt, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { groups, invites, memberships } from '@/db/schema'
import { createInvite, isMember, joinGroup, MAX_MEMBERS, setActiveGroup } from '@/lib/groups'
import { requireUser } from '@/lib/session'

export type GroupState = { error?: string }

/** Verifica que el usuario sea el dueño del grupo. */
async function ownGroup(groupId: number, userId: number) {
  const [group] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), eq(groups.ownerId, userId)))
  if (!group) throw new Error('Sólo el dueño del grupo puede hacer eso.')
  return group
}

/** La invitación si está vigente. */
async function usableInvite(code: string) {
  const [invite] = await db
    .select()
    .from(invites)
    .where(and(eq(invites.code, code), isNull(invites.revokedAt), gt(invites.expiresAt, new Date())))
  return invite ?? null
}

export async function createGroup(_prev: GroupState, formData: FormData): Promise<GroupState> {
  const user = await requireUser()
  const name = String(formData.get('name') ?? '').trim()
  if (name.length < 2) return { error: 'Ponele un nombre al grupo.' }

  const [group] = await db
    .insert(groups)
    .values({ name, ownerId: user.id })
    .returning({ id: groups.id })

  await db.insert(memberships).values({ groupId: group.id, userId: user.id })
  await setActiveGroup(group.id)
  redirect('/grupo')
}

export async function joinWithCode(_prev: GroupState, formData: FormData): Promise<GroupState> {
  const user = await requireUser()
  const raw = String(formData.get('code') ?? '').trim()
  // Acepta tanto el código suelto como el link entero pegado del chat.
  const code = raw.split('/').pop() ?? raw

  const invite = await usableInvite(code)
  if (!invite) return { error: 'Esa invitación no existe, ya venció o fue dada de baja.' }

  if (!(await joinGroup(invite.groupId, user.id)))
    return { error: `Ese grupo ya está completo: entran ${MAX_MEMBERS} como máximo.` }

  await setActiveGroup(invite.groupId)
  redirect('/')
}

/** Aceptar desde la página de la invitación, con el código ya en la URL. */
export async function acceptInvite(code: string) {
  const user = await requireUser()
  const invite = await usableInvite(code)
  if (!invite) redirect(`/invitacion/${encodeURIComponent(code)}?e=1`)

  if (!(await joinGroup(invite.groupId, user.id)))
    redirect(`/invitacion/${encodeURIComponent(code)}?e=lleno`)

  await setActiveGroup(invite.groupId)
  redirect('/')
}

export async function switchGroup(groupId: number) {
  const user = await requireUser()
  if (await isMember(groupId, user.id)) await setActiveGroup(groupId)
  redirect('/')
}

export async function renameGroup(formData: FormData) {
  const user = await requireUser()
  const groupId = Number(formData.get('groupId'))
  await ownGroup(groupId, user.id)

  const name = String(formData.get('name') ?? '').trim()
  if (name.length < 2) return

  await db.update(groups).set({ name }).where(eq(groups.id, groupId))
  revalidatePath('/grupo')
}

/** Da de baja el link anterior y emite uno nuevo. */
export async function refreshInvite(groupId: number) {
  const user = await requireUser()
  await ownGroup(groupId, user.id)

  await db
    .update(invites)
    .set({ revokedAt: new Date() })
    .where(and(eq(invites.groupId, groupId), isNull(invites.revokedAt)))
  await createInvite(groupId, user.id)

  revalidatePath('/grupo')
}

export async function revokeInvite(groupId: number) {
  const user = await requireUser()
  await ownGroup(groupId, user.id)

  await db
    .update(invites)
    .set({ revokedAt: new Date() })
    .where(and(eq(invites.groupId, groupId), isNull(invites.revokedAt)))

  revalidatePath('/grupo')
}

/** Saca a alguien del grupo. Sus rutinas quedan intactas. */
export async function removeMember(groupId: number, userId: number) {
  const user = await requireUser()
  const group = await ownGroup(groupId, user.id)
  if (userId === group.ownerId) return

  await db
    .delete(memberships)
    .where(and(eq(memberships.groupId, groupId), eq(memberships.userId, userId)))

  revalidatePath('/grupo')
}

export async function transferOwnership(groupId: number, userId: number) {
  const user = await requireUser()
  await ownGroup(groupId, user.id)
  if (!(await isMember(groupId, userId))) return

  await db.update(groups).set({ ownerId: userId }).where(eq(groups.id, groupId))
  revalidatePath('/grupo')
}

export async function leaveGroup(groupId: number) {
  const user = await requireUser()
  const [group] = await db.select().from(groups).where(eq(groups.id, groupId))
  // El dueño primero transfiere o borra el grupo: si no, queda sin responsable.
  if (!group || group.ownerId === user.id) return

  await db
    .delete(memberships)
    .where(and(eq(memberships.groupId, groupId), eq(memberships.userId, user.id)))

  redirect('/')
}

/** Borra el grupo y sus membresías. No toca las rutinas de nadie. */
export async function deleteGroup(groupId: number) {
  const user = await requireUser()
  await ownGroup(groupId, user.id)

  await db.delete(groups).where(eq(groups.id, groupId))
  redirect('/')
}
