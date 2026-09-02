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
 * Intención: "el martes voy, a las 19:30". Independiente de si después
 * entrenó. `at` es la hora en 'HH:MM' local, nula cuando todavía no la definió.
 */
export const attendance = pgTable(
  'attendance',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    day: date('day').notNull(),
    going: boolean('going').notNull().default(true),
    at: text('at'),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
)

/** Entrenamiento real. `endedAt` nulo = en curso. */
export const workoutSessions = pgTable('workout_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  routineId: integer('routine_id').references(() => routines.id, { onDelete: 'set null' }),
  day: date('day').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  cornaldo: integer('cornaldo'),
  note: text('note'),
})

/**
 * Copia de la rutina al momento de arrancar: editar la rutina después no
 * altera sesiones pasadas, y `position` se reordena al postergar un ejercicio.
 * `status`: 'pending' | 'done' | 'skipped'.
 */
export const sessionExercises = pgTable('session_exercises', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .notNull()
    .references(() => workoutSessions.id, { onDelete: 'cascade' }),
  exerciseId: integer('exercise_id')
    .notNull()
    .references(() => exercises.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  targetSets: integer('target_sets').notNull().default(3),
  targetReps: integer('target_reps').notNull().default(10),
  targetWeightKg: real('target_weight_kg'),
  status: text('status').notNull().default('pending'),
})

export const setLogs = pgTable('set_logs', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .notNull()
    .references(() => workoutSessions.id, { onDelete: 'cascade' }),
  exerciseId: integer('exercise_id')
    .notNull()
    .references(() => exercises.id, { onDelete: 'cascade' }),
  setNumber: integer('set_number').notNull(),
  reps: integer('reps').notNull(),
  weightKg: real('weight_kg'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type User = typeof users.$inferSelect
export type Group = typeof groups.$inferSelect
export type Invite = typeof invites.$inferSelect
export type Exercise = typeof exercises.$inferSelect
export type Routine = typeof routines.$inferSelect
export type SessionExercise = typeof sessionExercises.$inferSelect
export type SetLog = typeof setLogs.$inferSelect
export type WorkoutSession = typeof workoutSessions.$inferSelect
