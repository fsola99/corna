# CORNA

Qué día y a qué hora va cada uno del grupo al gimnasio, para cruzarse.

- **Semana**: el calendario, y todo lo demás cuelga de ahí. Lunes a sábado, de
  07 a 22: tocás la casilla del día y la hora en que caés y quedás anotado; el
  color dice quién es cada uno. La casilla se pone verdín cuando coinciden dos o
  más, abajo quedan listados los cruces y la cinta de arriba los canta. Se marca
  sola cuando terminás una sesión.
- **Rutinas**: cada uno arma las suyas, con series, repeticiones y peso objetivo.
  Una queda como la de por defecto.
- **Sesión**: cola de ejercicios que se reordena sola cuando la máquina está
  ocupada, cambio de un ejercicio por otro sin tocar la rutina, y registro de
  cada serie. Abajo queda fija la barra que termina la sesión entera de un
  toque: lo que no llegaste a hacer se cierra solo y la escala cornaldo del 1 al
  5 es opcional.
- **Historial**: sesiones pasadas con volumen, duración y cornaldo, y la curva de
  la mejor serie de cada ejercicio. Las tuyas se editan enteras —día, puntaje,
  nota y cada serie, una por una— o se borran. También podés ver el de tus
  amigos.

Sale impresa sobre papel negro: tinta hueso, y encima cobre y verdín mal
registrados, como una serigrafía barata. Se instala en la pantalla de inicio del
teléfono y abre a pantalla completa.

## Stack

| Capa | Qué |
|---|---|
| Framework | Next.js 16 (App Router, Server Components y Server Actions) |
| Base | Postgres — Neon en producción, contenedor local en desarrollo |
| ORM | Drizzle |
| Estilos | Tailwind v4; la paleta y las dos tintas corridas, en `src/app/globals.css` |
| Cuentas | Email y contraseña, con scrypt de `node:crypto` |
| Sesiones | Cookie firmada con `jose` |

No hay capa de API: las páginas consultan la base directamente y los formularios
llaman Server Actions.

## Correr en local

```bash
cp .env.example .env.local     # completá AUTH_SECRET
docker compose up -d           # Postgres en localhost:55432
npm install
npm run db:push                # crea las tablas
npm run db:seed                # carga el catálogo de ejercicios
npm run dev
```

Para `.env.local` en desarrollo:

```
DATABASE_URL="postgresql://corna:corna@localhost:55432/corna"
AUTH_SECRET="<openssl rand -base64 32>"
```

## Publicar

1. **Base**: creá un proyecto en [neon.tech](https://neon.tech) y copiá la
   connection string *pooled*. Al apuntar a un host `.neon.tech`, la app cambia
   sola al driver HTTP, que es el que sobrevive a las funciones efímeras.
2. **Tablas**: con esa URL en `.env.local`, corré `npm run db:push` y
   `npm run db:seed` una vez.
3. **Deploy**: importá el repo en [vercel.com](https://vercel.com) y cargá
   `DATABASE_URL` y `AUTH_SECRET` como variables de entorno.

Cada `git push` a `main` publica; cada pull request levanta su propia URL de
preview.

## Cuentas y grupos

Cada uno se registra con email y contraseña. El nombre es sólo cómo lo ven los
demás: cambiarlo no crea una persona nueva ni parte el historial.

Un grupo tiene un dueño, que es quien lo creó. El dueño genera un link de
invitación —reutilizable, vence a los 7 días— y lo pega en el chat del grupo;
quien lo abre se registra y entra. El dueño puede renovar o dar de baja el link,
sacar integrantes, pasarle el grupo a otro, o borrarlo.

Se puede estar en varios grupos. Las rutinas y el historial cuelgan de la
persona, no del grupo, así que te acompañan a todos; lo único que el grupo
define es quiénes aparecen en la grilla.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | servidor de desarrollo |
| `npm run build` | build de producción |
| `npm run db:push` | aplica `src/db/schema.ts` a la base |
| `npm run db:seed` | carga el catálogo de ejercicios |
| `npm run db:demo` | carga sesiones de ejemplo para ver el historial (sólo local) |
| `npm run typecheck` | TypeScript sin emitir |
