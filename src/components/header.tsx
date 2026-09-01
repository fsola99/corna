import Link from 'next/link'
import { logout } from '@/app/actions'
import type { Group, User } from '@/db/schema'

const TABS = [
  { href: '/', label: 'Semana', key: 'semana' },
  { href: '/rutinas', label: 'Rutinas', key: 'rutinas' },
  { href: '/sesion', label: 'Sesión', key: 'sesion' },
  { href: '/historial', label: 'Historial', key: 'historial' },
  { href: '/grupo', label: 'Grupo', key: 'grupo' },
] as const

export function Header({
  user,
  group,
  active,
}: {
  user: User
  group: Group | null
  active: string
}) {
  return (
    <header className="border-ink border-b-2">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 pt-6 pb-4">
        <div className="order-1">
          <Link href="/" className="font-display overprint overprint-register text-4xl sm:text-5xl">
            CORNA
          </Link>
          {group && (
            <span className="mt-1 block text-xs tracking-[0.2em] uppercase opacity-55">
              {group.name}
            </span>
          )}
        </div>

        <nav className="order-3 -mx-4 flex w-[calc(100%+2rem)] gap-0.5 overflow-x-auto px-4 sm:order-2 sm:mx-0 sm:w-auto sm:gap-1 sm:overflow-visible sm:px-0">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={active === tab.key ? 'page' : undefined}
              className={`font-head px-1.5 py-1 text-xs font-black tracking-wide uppercase sm:px-3 sm:text-lg sm:tracking-widest ${
                active === tab.key
                  ? 'ink-flat bg-pink text-ink'
                  : 'border-2 border-transparent hover:border-ink'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <div className="order-2 flex shrink-0 items-center gap-3 sm:order-3">
          <Link
            href="/cuenta"
            className="font-head text-sm font-bold tracking-widest whitespace-nowrap uppercase underline decoration-blue decoration-2 underline-offset-4"
          >
            {user.name}
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="font-head text-sm font-bold tracking-widest whitespace-nowrap uppercase underline decoration-pink decoration-2 underline-offset-4 opacity-70"
            >
              salir
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
