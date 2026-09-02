import { headers } from 'next/headers'
import { Header } from '@/components/header'
import { activeInvite, groupMembers, myGroups, requireGroup } from '@/lib/groups'
import { requireUser } from '@/lib/session'
import { longDay } from '@/lib/week'
import Link from 'next/link'
import {
  deleteGroup,
  leaveGroup,
  refreshInvite,
  removeMember,
  renameGroup,
  revokeInvite,
  switchGroup,
  transferOwnership,
} from './actions'
import { InviteLink } from './invite-link'

export default async function GroupPage() {
  const user = await requireUser()
  const group = await requireGroup(user.id)
  const isOwner = group.ownerId === user.id

  const host = await headers()
  const origin = `${host.get('x-forwarded-proto') ?? 'http'}://${host.get('host')}`

  const [members, invite, mine] = await Promise.all([
    groupMembers(group.id),
    activeInvite(group.id),
    myGroups(user.id),
  ])

  return (
    <>
      <Header user={user} group={group} active="grupo" />

      <main className="mx-auto max-w-3xl px-4 pt-8 pb-16">
        {isOwner ? (
          <form action={renameGroup} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="groupId" value={group.id} />
            <input
              name="name"
              defaultValue={group.name}
              maxLength={40}
              aria-label="Nombre del grupo"
              className="field font-head min-w-52 flex-1 py-1 text-left text-4xl leading-none font-black tracking-tight uppercase sm:text-5xl"
            />
            <button
              type="submit"
              className="ink-flat ink-press font-head px-3 py-1.5 text-sm font-black tracking-[0.2em] uppercase"
            >
              Renombrar
            </button>
          </form>
        ) : (
          <h1 className="font-head text-4xl leading-none font-black tracking-tight uppercase sm:text-5xl">
            {group.name}
          </h1>
        )}

        <p className="mt-2 text-sm opacity-70">
          {members.length} {members.length === 1 ? 'integrante' : 'integrantes'}
          {!isOwner && ' · lo administra el dueño'}
        </p>

        <section className="ink bg-paper-2 mt-8 p-5">
          <h2 className="font-head text-xl font-black tracking-wide uppercase">Invitar</h2>
          {invite ? (
            <>
              <p className="mt-1 mb-3 text-sm opacity-70">
                Pasales este link. Vence el {longDay(invite.expiresAt.toISOString().slice(0, 10))}.
              </p>
              <InviteLink url={`${origin}/invitacion/${invite.code}`} />
              {isOwner && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <SmallButton action={refreshInvite.bind(null, group.id)}>
                    Renovar el link
                  </SmallButton>
                  <SmallButton action={revokeInvite.bind(null, group.id)}>Dar de baja</SmallButton>
                </div>
              )}
            </>
          ) : isOwner ? (
            <>
              <p className="mt-1 mb-3 text-sm opacity-70">
                No hay ningún link activo. Generá uno y pegalo en el chat del grupo.
              </p>
              <SmallButton action={refreshInvite.bind(null, group.id)}>Generar link</SmallButton>
            </>
          ) : (
            <p className="mt-1 text-sm opacity-70">
              No hay link activo. Pedile uno a {members.find((m) => m.id === group.ownerId)?.name}.
            </p>
          )}
        </section>

        <section className="mt-10">
          <h2 className="font-head text-teal text-sm font-black tracking-[0.25em] uppercase">
            Integrantes
          </h2>
          <ul className="border-ink mt-2 border-t-2">
            {members.map((member) => (
              <li
                key={member.id}
                className="border-ink flex flex-wrap items-center justify-between gap-3 border-b-2 py-3"
              >
                <div className="min-w-0">
                  <span className="font-head text-lg leading-tight font-black tracking-wide uppercase">
                    {member.name}
                    {member.id === user.id && <span className="text-rust"> ◆</span>}
                  </span>
                  <span className="block text-xs opacity-60">
                    {member.id === group.ownerId && 'dueño · '}
                    {isOwner ? member.email : `desde ${longDay(member.joinedAt.toISOString().slice(0, 10))}`}
                  </span>
                </div>

                {isOwner && member.id !== group.ownerId && (
                  <div className="flex gap-2">
                    <SmallButton action={transferOwnership.bind(null, group.id, member.id)}>
                      Hacer dueño
                    </SmallButton>
                    <SmallButton
                      action={removeMember.bind(null, group.id, member.id)}
                      label={`Sacar a ${member.name}`}
                    >
                      ✕
                    </SmallButton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-head text-teal text-sm font-black tracking-[0.25em] uppercase">
            Tus grupos
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {mine.map((other) =>
              other.id === group.id ? (
                <span
                  key={other.id}
                  className="ink-flat bg-rust font-head px-3 py-1.5 text-sm font-black tracking-[0.15em] uppercase"
                >
                  {other.name}
                </span>
              ) : (
                <SmallButton key={other.id} action={switchGroup.bind(null, other.id)}>
                  {other.name}
                </SmallButton>
              ),
            )}
            <Link
              href="/grupo/nuevo"
              className="ink-flat ink-press bg-paper-2 font-head px-3 py-1.5 text-sm font-black tracking-[0.15em] uppercase"
            >
              + Otro grupo
            </Link>
          </div>
        </section>

        <div className="mt-12">
          {isOwner ? (
            <form action={deleteGroup.bind(null, group.id)}>
              <button
                type="submit"
                className="font-head text-sm font-bold tracking-[0.2em] uppercase underline decoration-rust decoration-2 underline-offset-4 opacity-60"
              >
                Borrar el grupo
              </button>
              <p className="mt-1 text-xs opacity-50">
                Desaparece la grilla compartida. Las rutinas y el historial de cada uno quedan.
              </p>
            </form>
          ) : (
            <form action={leaveGroup.bind(null, group.id)}>
              <button
                type="submit"
                className="font-head text-sm font-bold tracking-[0.2em] uppercase underline decoration-rust decoration-2 underline-offset-4 opacity-60"
              >
                Salir del grupo
              </button>
            </form>
          )}
        </div>
      </main>
    </>
  )
}

function SmallButton({
  action,
  children,
  label,
}: {
  action: () => Promise<void>
  children: React.ReactNode
  label?: string
}) {
  return (
    <form action={action}>
      <button
        type="submit"
        aria-label={label}
        className="ink-flat ink-press bg-paper-2 font-head px-3 py-1.5 text-sm font-black tracking-[0.15em] uppercase"
      >
        {children}
      </button>
    </form>
  )
}
