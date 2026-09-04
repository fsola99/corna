import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { groups, invites, users } from '@/db/schema'
import { isMember, MAX_MEMBERS, memberCount } from '@/lib/groups'
import { currentUser } from '@/lib/session'
import { acceptInvite } from '@/app/grupo/actions'

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params

  const [invite] = await db
    .select({
      groupId: invites.groupId,
      groupName: groups.name,
      ownerName: users.name,
      expiresAt: invites.expiresAt,
      revokedAt: invites.revokedAt,
    })
    .from(invites)
    .innerJoin(groups, eq(groups.id, invites.groupId))
    .innerJoin(users, eq(users.id, groups.ownerId))
    .where(eq(invites.code, code))

  const valid = invite && !invite.revokedAt && invite.expiresAt > new Date()
  const user = await currentUser()

  if (valid && user && (await isMember(invite.groupId, user.id))) redirect('/')

  const full = valid ? (await memberCount(invite.groupId)) >= MAX_MEMBERS : false

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-8 px-4 py-12">
      <h1 className="font-display overprint overprint-register text-6xl">CORNA</h1>

      {!valid ? (
        <div className="ink bg-paper-2 w-full p-6 text-center">
          <p className="font-head text-2xl leading-tight font-black tracking-wide uppercase">
            Esta invitación ya no sirve
          </p>
          <p className="mt-2 text-sm opacity-70">
            Venció o el dueño del grupo la dio de baja. Pedile un link nuevo.
          </p>
          <Link
            href="/"
            className="font-head mt-4 inline-block text-sm font-bold tracking-[0.2em] uppercase underline decoration-rust decoration-2 underline-offset-4"
          >
            Ir al inicio
          </Link>
        </div>
      ) : full ? (
        <div className="ink bg-paper-2 w-full p-6 text-center">
          <p className="font-head text-2xl leading-tight font-black tracking-wide uppercase">
            {invite.groupName} está completo
          </p>
          <p className="mt-2 text-sm opacity-70">
            Entran {MAX_MEMBERS} y ya son {MAX_MEMBERS}. Que alguien salga, o armá tu propio grupo.
          </p>
          <Link
            href="/"
            className="font-head mt-4 inline-block text-sm font-bold tracking-[0.2em] uppercase underline decoration-rust decoration-2 underline-offset-4"
          >
            Ir al inicio
          </Link>
        </div>
      ) : (
        <div className="ink bg-paper-2 w-full p-6 text-center">
          <p className="font-head text-sm font-black tracking-[0.3em] uppercase opacity-60">
            Te invitaron a
          </p>
          <p className="font-head mt-1 text-4xl leading-none font-black tracking-tight uppercase">
            {invite.groupName}
          </p>
          <p className="mt-2 text-sm opacity-70">de {invite.ownerName}</p>

          {user ? (
            <form action={acceptInvite.bind(null, code)} className="mt-6">
              <button
                type="submit"
                className="ink-sm ink-press bg-rust font-display w-full py-4 text-xl"
              >
                Entrar al grupo
              </button>
            </form>
          ) : (
            <div className="mt-6 space-y-3">
              <Link
                href={`/registro?i=${encodeURIComponent(code)}`}
                className="ink-sm ink-press bg-rust font-display block w-full py-4 text-xl"
              >
                Crear cuenta
              </Link>
              <Link
                href={`/login?i=${encodeURIComponent(code)}`}
                className="font-head block text-sm font-bold tracking-[0.2em] uppercase underline decoration-teal decoration-2 underline-offset-4"
              >
                Ya tengo cuenta
              </Link>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
