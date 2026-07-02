import { boolean, integer, pgEnum, pgTable, real, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';

export const Role = pgEnum('Role', ['coach', 'member'])

export const SignInAttemptOutcome = pgEnum('SignInAttemptOutcome', [
  'no_invite',
  'invalid_invite',
  'email_mismatch',
  'invite_expired',
  'invite_used',
])

export const WorkoutStyle = pgEnum('WorkoutStyle', [
  'strength_circuit',
  'hiit',
  'cardio',
])

/** Groups exercises within a workout; maps to circuits, HIIT intervals, or cardio segments. */
export const WorkoutBlockType = pgEnum('WorkoutBlockType', [
  'circuit',
  'interval',
  'segment',
])

export const ExercisePrescriptionMode = pgEnum('ExercisePrescriptionMode', [
  'reps',
  'time',
])

export const ExercisePlaneOfMotion = pgEnum('ExercisePlaneOfMotion', [
  'sagittal',
  'frontal',
  'transverse',
])

export const ExerciseSupport = pgEnum('ExerciseSupport', [
  'unilateral',
  'bilateral',
])

export const ExerciseMuscleGroup = pgEnum('ExerciseMuscleGroup', [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'core',
])

export const ExerciseEquipment = pgEnum('ExerciseEquipment', [
  'machine',
  'barbell',
  'dumbbell',
  'kettlebell',
  'resistance_band',
  'cable',
  'bodyweight',
  'trx',
  'rings',
  'foam_roller',
  'stability_ball',
  'medicine_ball',
  'sandbag',
  'sled',
  'rower',
  'ski_erg',
  'parallettes',
  'trap_bar',
  'glider',
])

export type ExercisePlaneOfMotionValue =
  (typeof ExercisePlaneOfMotion.enumValues)[number]
export type ExerciseSupportValue = (typeof ExerciseSupport.enumValues)[number]
export type ExerciseMuscleGroupValue = (typeof ExerciseMuscleGroup.enumValues)[number]
export type ExerciseEquipmentValue = (typeof ExerciseEquipment.enumValues)[number]

export const User = pgTable('User', {
	id: uuid('id').primaryKey().defaultRandom(),
	firstName: text('firstName').notNull(),
	lastName: text('lastName').notNull(),
  age: integer(),
  email: varchar('email', { length: 255 }).notNull().unique(),
	createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
	updatedAt: timestamp('updatedAt', { precision: 3 }).notNull(),
	role: Role('role').notNull(),
  approvedCoach: boolean('approved').notNull().default(false),
  admin: boolean('admin').notNull().default(false),
});

export const GoogleProfile = pgTable('GoogleProfile', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('userId').references(() => User.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  profileId: varchar('profileId').notNull().unique(), 
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: text('name').notNull(),
  picture: text('picture').notNull(),
  verifiedEmail: boolean('verifiedEmail').notNull().default(false),
});

export const Invite = pgTable('Invite', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: varchar('token', { length: 64 }).notNull().unique(),
  role: Role('role').notNull(),
  email: varchar('email', { length: 255 }),
  createdById: uuid('createdById')
    .notNull()
    .references(() => User.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  coachId: uuid('coachId')
    .references(() => User.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  expiresAt: timestamp('expiresAt', { precision: 3 }).notNull(),
  usedAt: timestamp('usedAt', { precision: 3 }),
  usedByUserId: uuid('usedByUserId')
    .references(() => User.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
});

export const SignInAttempt = pgTable('SignInAttempt', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull(),
  googleProfileId: varchar('googleProfileId', { length: 255 }).notNull(),
  attemptedRole: Role('attemptedRole').notNull(),
  inviteToken: varchar('inviteToken', { length: 64 }),
  outcome: SignInAttemptOutcome('outcome').notNull(),
  createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
});

/** Reusable exercise catalog (e.g. barbell bench press) for prescriptions and trend queries. */
export const Exercise = pgTable('Exercise', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  /** Sagittal, frontal, or transverse plane of movement. */
  planeOfMotion: ExercisePlaneOfMotion('planeOfMotion').notNull(),
  /** Unilateral or bilateral support/stabilization pattern. */
  support: ExerciseSupport('support').notNull(),
  /** Primary muscle group(s) targeted by the exercise. */
  muscleGroup: ExerciseMuscleGroup('muscleGroup').notNull(),
  /** Primary equipment used to perform the movement. */
  equipment: ExerciseEquipment('equipment').notNull(),
  createdById: uuid('createdById')
    .references(() => User.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { precision: 3 }).notNull(),
})

/**
 * Prescribed workout assigned to a member by a coach.
 * Structure is defined by ordered blocks whose shape depends on `style`.
 */
export const Workout = pgTable('Workout', {
  id: uuid('id').primaryKey().defaultRandom(),
  coachId: uuid('coachId')
    .notNull()
    .references(() => User.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  memberId: uuid('memberId')
    .notNull()
    .references(() => User.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  workoutDate: timestamp('workoutDate', { precision: 3 }).notNull(),
  style: WorkoutStyle('style').notNull(),
  title: text('title'),
  notes: text('notes'),
  createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { precision: 3 }).notNull(),
})

/**
 * A grouping unit inside a workout.
 * - `circuit`: exercises performed in succession, repeated for `rounds` with rest between rounds.
 * - `interval`: HIIT work/rest timing applied to block exercises.
 * - `segment`: cardio duration/intensity target; may have zero block exercises when the segment itself is the activity.
 */
export const WorkoutBlock = pgTable('WorkoutBlock', {
  id: uuid('id').primaryKey().defaultRandom(),
  workoutId: uuid('workoutId')
    .notNull()
    .references(() => Workout.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  blockType: WorkoutBlockType('blockType').notNull(),
  orderIndex: integer('orderIndex').notNull(),
  name: text('name'),
  rounds: integer('rounds'),
  restBetweenRoundsSeconds: integer('restBetweenRoundsSeconds'),
  workDurationSeconds: integer('workDurationSeconds'),
  restDurationSeconds: integer('restDurationSeconds'),
  targetDurationSeconds: integer('targetDurationSeconds'),
  targetIntensity: text('targetIntensity'),
  notes: text('notes'),
})

/** Prescribed exercise within a workout block. */
export const WorkoutBlockExercise = pgTable('WorkoutBlockExercise', {
  id: uuid('id').primaryKey().defaultRandom(),
  blockId: uuid('blockId')
    .notNull()
    .references(() => WorkoutBlock.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  exerciseId: uuid('exerciseId')
    .notNull()
    .references(() => Exercise.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
  orderIndex: integer('orderIndex').notNull(),
  prescriptionMode: ExercisePrescriptionMode('prescriptionMode').notNull(),
  targetReps: integer('targetReps'),
  targetDurationSeconds: integer('targetDurationSeconds'),
  targetRpe: integer('targetRpe'),
  targetWeight: real('targetWeight'),
  tempo: varchar('tempo', { length: 32 }),
  cue1: text('cue1'),
  cue2: text('cue2'),
  cue3: text('cue3'),
  restAfterSeconds: integer('restAfterSeconds'),
})

/** Completed workout session with actual performance data in `WorkoutLogEntry` rows. */
export const WorkoutLog = pgTable('WorkoutLog', {
  id: uuid('id').primaryKey().defaultRandom(),
  workoutId: uuid('workoutId')
    .references(() => Workout.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  coachId: uuid('coachId')
    .notNull()
    .references(() => User.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  memberId: uuid('memberId')
    .notNull()
    .references(() => User.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  loggedById: uuid('loggedById')
    .notNull()
    .references(() => User.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  completedAt: timestamp('completedAt', { precision: 3 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
})

/** Actual reps, time, RPE, and load logged for a prescribed (or ad-hoc) exercise. */
export const WorkoutLogEntry = pgTable('WorkoutLogEntry', {
  id: uuid('id').primaryKey().defaultRandom(),
  workoutLogId: uuid('workoutLogId')
    .notNull()
    .references(() => WorkoutLog.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  blockExerciseId: uuid('blockExerciseId')
    .references(() => WorkoutBlockExercise.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  exerciseId: uuid('exerciseId')
    .notNull()
    .references(() => Exercise.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
  roundNumber: integer('roundNumber').notNull().default(1),
  setNumber: integer('setNumber'),
  actualReps: integer('actualReps'),
  actualDurationSeconds: integer('actualDurationSeconds'),
  actualRpe: integer('actualRpe'),
  actualWeight: real('actualWeight'),
  notes: text('notes'),
})

/** Links coaches to the members on their roster (one coach → many members). */
export const CoachMember = pgTable('CoachMember', {
  id: uuid('id').primaryKey().defaultRandom(),
  coachId: uuid('coachId')
    .notNull()
    .references(() => User.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  memberId: uuid('memberId')
    .notNull()
    .references(() => User.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
});

export const UserRelations = relations(User, ({ one, many }) => ({
  googleProfile: one(GoogleProfile, {
    fields: [User.id],
    references: [GoogleProfile.userId],
  }),
  coachedMembers: many(CoachMember, { relationName: 'coachMembers' }),
  coachAssignment: one(CoachMember, {
    fields: [User.id],
    references: [CoachMember.memberId],
    relationName: 'memberCoach',
  }),
  invitesCreated: many(Invite, { relationName: 'invitesCreated' }),
  exercisesCreated: many(Exercise, { relationName: 'exercisesCreated' }),
  coachedWorkouts: many(Workout, { relationName: 'workoutCoach' }),
  assignedWorkouts: many(Workout, { relationName: 'workoutMember' }),
  coachedWorkoutLogs: many(WorkoutLog, { relationName: 'workoutLogCoach' }),
  memberWorkoutLogs: many(WorkoutLog, { relationName: 'workoutLogMember' }),
  workoutLogsLogged: many(WorkoutLog, { relationName: 'workoutLogLoggedBy' }),
}));

export const InviteRelations = relations(Invite, ({ one }) => ({
  createdBy: one(User, {
    fields: [Invite.createdById],
    references: [User.id],
    relationName: 'invitesCreated',
  }),
  coach: one(User, {
    fields: [Invite.coachId],
    references: [User.id],
    relationName: 'inviteCoach',
  }),
  usedBy: one(User, {
    fields: [Invite.usedByUserId],
    references: [User.id],
    relationName: 'inviteUsedBy',
  }),
}));

export const GoogleProfileRelations = relations(GoogleProfile, ({ one }) => ({
  user: one(User, {
    fields: [GoogleProfile.userId],
    references: [User.id],
  }),
}));

export const CoachMemberRelations = relations(CoachMember, ({ one }) => ({
  coach: one(User, {
    fields: [CoachMember.coachId],
    references: [User.id],
    relationName: 'coachMembers',
  }),
  member: one(User, {
    fields: [CoachMember.memberId],
    references: [User.id],
    relationName: 'memberCoach',
  }),
}));

export const ExerciseRelations = relations(Exercise, ({ one, many }) => ({
  createdBy: one(User, {
    fields: [Exercise.createdById],
    references: [User.id],
    relationName: 'exercisesCreated',
  }),
  blockPrescriptions: many(WorkoutBlockExercise),
  logEntries: many(WorkoutLogEntry),
}));

export const WorkoutRelations = relations(Workout, ({ one, many }) => ({
  coach: one(User, {
    fields: [Workout.coachId],
    references: [User.id],
    relationName: 'workoutCoach',
  }),
  member: one(User, {
    fields: [Workout.memberId],
    references: [User.id],
    relationName: 'workoutMember',
  }),
  blocks: many(WorkoutBlock),
  logs: many(WorkoutLog),
}));

export const WorkoutBlockRelations = relations(WorkoutBlock, ({ one, many }) => ({
  workout: one(Workout, {
    fields: [WorkoutBlock.workoutId],
    references: [Workout.id],
  }),
  exercises: many(WorkoutBlockExercise),
}));

export const WorkoutBlockExerciseRelations = relations(WorkoutBlockExercise, ({ one, many }) => ({
  block: one(WorkoutBlock, {
    fields: [WorkoutBlockExercise.blockId],
    references: [WorkoutBlock.id],
  }),
  exercise: one(Exercise, {
    fields: [WorkoutBlockExercise.exerciseId],
    references: [Exercise.id],
  }),
  logEntries: many(WorkoutLogEntry),
}));

export const WorkoutLogRelations = relations(WorkoutLog, ({ one, many }) => ({
  workout: one(Workout, {
    fields: [WorkoutLog.workoutId],
    references: [Workout.id],
  }),
  coach: one(User, {
    fields: [WorkoutLog.coachId],
    references: [User.id],
    relationName: 'workoutLogCoach',
  }),
  member: one(User, {
    fields: [WorkoutLog.memberId],
    references: [User.id],
    relationName: 'workoutLogMember',
  }),
  loggedBy: one(User, {
    fields: [WorkoutLog.loggedById],
    references: [User.id],
    relationName: 'workoutLogLoggedBy',
  }),
  entries: many(WorkoutLogEntry),
}));

export const WorkoutLogEntryRelations = relations(WorkoutLogEntry, ({ one }) => ({
  workoutLog: one(WorkoutLog, {
    fields: [WorkoutLogEntry.workoutLogId],
    references: [WorkoutLog.id],
  }),
  blockExercise: one(WorkoutBlockExercise, {
    fields: [WorkoutLogEntry.blockExerciseId],
    references: [WorkoutBlockExercise.id],
  }),
  exercise: one(Exercise, {
    fields: [WorkoutLogEntry.exerciseId],
    references: [Exercise.id],
  }),
}));
