import {
  boolean,
  date,
  integer,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

/** La identidad. `name` es sólo cómo se muestra: cambiarlo no crea a nadie nuevo. */
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const groups = pgTable('groups', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  ownerId: integer('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const memberships = pgTable(
  'memberships',
  {
    groupId: integer('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.userId] })],
)

/**
 * Link de invitación reutilizable: uno solo se pega en el chat del grupo.
 * Vale mientras no esté vencido ni revocado.
 */
export const invites = pgTable('invites', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  code: text('code').notNull().unique(),
  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
})

/** Catálogo compartido. `createdBy` sólo marca quién lo agregó a mano. */
export const exercises = pgTable(
  'exercises',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    zone: text('zone').notNull(),
    createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => [uniqueIndex('exercises_name_key').on(t.name)],
)

export const routines = pgTable('routines', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const routineExercises = pgTable('routine_exercises', {
  id: serial('id').primaryKey(),
  routineId: integer('routine_id')
    .notNull()
    .references(() => routines.id, { onDelete: 'cascade' }),
  exerciseId: integer('exercise_id')
    .notNull()
    .references(() => exercises.id, { onDelete: 'cascade' }),
  position: integer('position').notNull().default(0),
  targetSets: integer('target_sets').notNull().default(3),
  targetReps: integer('target_reps').notNull().default(10),
  targetWeightKg: real('target_weight_kg'),
})

/**
 * La semana tipo: "los martes voy de 19:30 a 21:00", sin fecha. Vale para todas
 * las semanas mientras el renglón exista. `weekday` va de 0 —lunes— a 5
 * —sábado—, y el turno son dos horas 'HH:MM' locales.
 */
export const weeklyPlans = pgTable(
  'weekly_plans',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    weekday: integer('weekday').notNull(),
    startAt: text('start_at').notNull(),
    endAt: text('end_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.weekday] })],
)

/**
 * Lo que pasa un día puntual, y lo que manda sobre la semana tipo: con `going`
 * en verdadero el turno de ese día va de `startAt` a `endAt`, y en falso ese
 * día no va aunque la semana tipo diga que sí. Sin renglón, el día lo decide
 * la semana tipo.
 *
 * Las dos horas son 'HH:MM' locales, y quedan nulas cuando dijo que va pero
 * todavía no marcó a qué hora.
 */
export const attendance = pgTable(
  'attendance',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    day: date('day').notNull(),
    going: boolean('going').notNull().default(true),
    startAt: text('start_at'),
    endAt: text('end_at'),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
)

export type User = typeof users.$inferSelect
export type Group = typeof groups.$inferSelect
export type Invite = typeof invites.$inferSelect
export type Exercise = typeof exercises.$inferSelect
export type Routine = typeof routines.$inferSelect
export type WeeklyPlan = typeof weeklyPlans.$inferSelect
