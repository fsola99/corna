import Link from 'next/link'
import { myGroups } from '@/lib/groups'
import { requireUser } from '@/lib/session'
import { JoinForms } from './join-forms'

export default async function NewGroupPage() {
  const user = await requireUser()
  const groups = await myGroups(user.id)

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-8 px-4 py-12">
      <div>
        <Link href="/" className="font-display overprint overprint-register text-5xl">
          CORNA
        </Link>
        <h1 className="font-head mt-5 text-3xl leading-none font-black tracking-tight uppercase">
          {groups.length === 0 ? `Hola, ${user.name}` : 'Otro grupo'}
        </h1>
        <p className="mt-2 text-sm opacity-70">
          {groups.length === 0
            ? 'Para arrancar necesitás un grupo: creá el tuyo, o entrá al de un amigo con el link que te pasó.'
            : 'Podés estar en varios grupos a la vez. Tus rutinas son unas solas y te acompañan a todos.'}
        </p>
      </div>

      <JoinForms />

      {groups.length > 0 && (
        <Link
          href="/"
          className="font-head text-center text-sm font-bold tracking-[0.2em] uppercase underline decoration-teal decoration-2 underline-offset-4"
        >
          ← Volver
        </Link>
      )}
    </main>
  )
}
