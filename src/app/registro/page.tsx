import { redirect } from 'next/navigation'
import { AuthForm } from '@/app/login/auth-form'
import { currentUser } from '@/lib/session'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ i?: string }>
}) {
  if (await currentUser()) redirect('/')
  const { i } = await searchParams

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-8 px-4 py-12">
      <h1 className="font-display overprint overprint-register text-6xl sm:text-7xl">CORNA</h1>
      <AuthForm mode="register" invite={i} />
      <p className="max-w-xs text-center text-sm">
        Tu cuenta es tuya y el nombre lo podés cambiar cuando quieras sin perder nada.
      </p>
    </main>
  )
}
