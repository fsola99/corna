import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/session'
import { AuthForm } from './auth-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ i?: string }>
}) {
  if (await currentUser()) redirect('/')
  const { i } = await searchParams

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-8 px-4 py-12">
      <h1 className="font-display overprint overprint-register text-6xl sm:text-7xl">CORNA</h1>
      <AuthForm mode="login" invite={i} />
    </main>
  )
}
