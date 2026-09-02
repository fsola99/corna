import { asc, eq, sql } from 'drizzle-orm'
import Link from 'next/link'
import { Header } from '@/components/header'
import { db } from '@/db'
import { routineExercises, routines } from '@/db/schema'
import { activeGroup } from '@/lib/groups'
import { requireUser } from '@/lib/session'
import { createRoutine, makeDefault } from './actions'

export default async function RoutinesPage() {
  const me = await requireUser()
  const group = await activeGroup(me.id)

  const list = await db
    .select({
      id: routines.id,
      name: routines.name,
      isDefault: routines.isDefault,
      count: sql<number>`count(${routineExercises.id})`,
    })
    .from(routines)
    .leftJoin(routineExercises, eq(routineExercises.routineId, routines.id))
    .where(eq(routines.userId, me.id))
    .groupBy(routines.id)
    .orderBy(asc(routines.id))

  return (
    <>
      <Header user={me} group={group} active="rutinas" />

      <main className="mx-auto max-w-3xl px-4 pt-8 pb-16">
        <h1 className="font-head text-4xl leading-none font-black tracking-tight uppercase sm:text-6xl">
          Tus rutinas
        </h1>
        <p className="mt-2 mb-8 text-sm opacity-70">
          La marcada por defecto es la que aparece elegida cuando arrancás una sesión.
        </p>

        {list.length === 0 ? (
          <p className="ink-flat border-dashed px-5 py-8 text-center text-base">
            Todavía no tenés ninguna. Armá la primera abajo: ponele un nombre y después le cargás
            los ejercicios.
          </p>
        ) : (
          <ul className="space-y-4">
            {list.map((routine, i) => (
              <li
                key={routine.id}
                className="ink bg-paper-2 flex flex-wrap items-center justify-between gap-4 p-5"
                style={{ rotate: i % 2 === 0 ? '-0.35deg' : '0.35deg' }}
              >
                <div>
                  <Link
                    href={`/rutinas/${routine.id}`}
                    className="font-head block text-2xl leading-none font-black tracking-wide uppercase underline decoration-rust decoration-[3px] underline-offset-[6px] sm:text-3xl"
                  >
                    {routine.name}
                  </Link>
                  <span className="mt-1 block text-sm opacity-70">
                    {Number(routine.count)}{' '}
                    {Number(routine.count) === 1 ? 'ejercicio' : 'ejercicios'}
                  </span>
                </div>

                {routine.isDefault ? (
                  <span className="ink-flat bg-teal text-paper font-head px-3 py-1.5 text-sm font-black tracking-[0.2em] uppercase">
                    Por defecto
                  </span>
                ) : (
                  <form action={makeDefault}>
                    <input type="hidden" name="routineId" value={routine.id} />
                    <button
                      type="submit"
                      className="ink-flat ink-press bg-paper-2 font-head px-3 py-1.5 text-sm font-black tracking-[0.2em] uppercase"
                    >
                      Usar por defecto
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        <form action={createRoutine} className="ink bg-paper-2 mt-10 flex flex-wrap gap-3 p-5">
          <label className="min-w-52 flex-1">
            <span className="font-head block text-sm font-bold tracking-[0.2em] uppercase">
              Rutina nueva
            </span>
            <input
              name="name"
              maxLength={40}
              required
              placeholder="Torso · Empuje · Pierna"
              className="field mt-1 w-full py-1 text-xl"
            />
          </label>
          <button
            type="submit"
            className="ink-sm ink-press bg-rust font-display self-end px-5 py-3 text-base"
          >
            Crear
          </button>
        </form>
      </main>
    </>
  )
}
