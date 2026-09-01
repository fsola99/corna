import { Header } from '@/components/header'
import { activeGroup } from '@/lib/groups'
import { requireUser } from '@/lib/session'
import { AccountForms } from './forms'

export default async function AccountPage() {
  const user = await requireUser()
  const group = await activeGroup(user.id)

  return (
    <>
      <Header user={user} group={group} active="cuenta" />

      <main className="mx-auto max-w-3xl px-4 pt-8 pb-16">
        <h1 className="font-head text-4xl leading-none font-black tracking-tight uppercase sm:text-6xl">
          Tu cuenta
        </h1>
        <AccountForms name={user.name} email={user.email} />
      </main>
    </>
  )
}
