import { and, asc, eq, ilike, or } from "drizzle-orm"

import db from "../db"
import {
  Exercise,
  WorkoutLog,
  WorkoutLogEntry,
  type ExerciseEquipmentValue,
  type ExercisePlaneOfMotionValue,
  type ExerciseSupportValue,
  type ExerciseMuscleGroupValue,
} from "../db/schema"

export type {
  ExerciseEquipmentValue,
  ExercisePlaneOfMotionValue,
  ExerciseSupportValue,
  ExerciseMuscleGroupValue,
} from "../db/schema"

export type ExerciseInsert = typeof Exercise.$inferInsert
export type ExerciseSelect = typeof Exercise.$inferSelect

/** Fields collected by the coach exercise create/edit form. */
export type ExerciseFormInput = {
  name: string
  description?: string | null
  muscleGroup: ExerciseMuscleGroupValue
  planeOfMotion: ExercisePlaneOfMotionValue
  support: ExerciseSupportValue
  equipment: ExerciseEquipmentValue
}

export type ExerciseUpdate = Partial<
  Pick<
    ExerciseInsert,
    | "name"
    | "description"
    | "muscleGroup"
    | "planeOfMotion"
    | "support"
    | "equipment"
    | "isSystem"
    | "createdById"
  >
>

/** Logged performance for an exercise, ordered by session date for volume calculations. */
export type ExerciseLogVolumePoint = {
  exerciseName: string
  completedAt: Date | null
  actualReps: number | null
  actualDurationSeconds: number | null
  actualWeight: number | null
  roundNumber: number
  setNumber: number | null
}

/** System library exercises plus rows owned by this coach. */
function coachCatalogCondition(coachId: string) {
  return or(eq(Exercise.isSystem, true), eq(Exercise.createdById, coachId))
}

export function createExercise(input: Omit<ExerciseInsert, "id" | "createdAt" | "updatedAt">) {
  const now = new Date()

  return db
    .insert(Exercise)
    .values({
      ...input,
      updatedAt: now,
    })
    .returning()
}

export function createCoachExercise(coachId: string, input: ExerciseFormInput) {
  return createExercise({
    name: input.name,
    description: input.description ?? null,
    muscleGroup: input.muscleGroup,
    planeOfMotion: input.planeOfMotion,
    support: input.support,
    equipment: input.equipment,
    isSystem: false,
    createdById: coachId,
  })
}

export function getExerciseById(id: string) {
  return db.select().from(Exercise).where(eq(Exercise.id, id))
}

/** Owned coach exercise only (not system library). Used for edit/delete. */
export function getOwnedCoachExerciseById(coachId: string, exerciseId: string) {
  return db
    .select()
    .from(Exercise)
    .where(
      and(
        eq(Exercise.id, exerciseId),
        eq(Exercise.createdById, coachId),
        eq(Exercise.isSystem, false)
      )
    )
}

/** Any exercise in the coach catalog (system library or owned). */
export function getCoachExerciseById(coachId: string, exerciseId: string) {
  return db
    .select()
    .from(Exercise)
    .where(and(eq(Exercise.id, exerciseId), coachCatalogCondition(coachId)))
}

export function getCoachExercises(coachId: string, filters?: { search?: string }) {
  const conditions = [coachCatalogCondition(coachId)]

  if (filters?.search) {
    conditions.push(ilike(Exercise.name, `%${filters.search}%`))
  }

  return db
    .select()
    .from(Exercise)
    .where(and(...conditions))
    .orderBy(asc(Exercise.name))
}

export function getExercises(filters?: {
  createdById?: string
  search?: string
  isSystem?: boolean
}) {
  const conditions = []

  if (filters?.createdById) {
    conditions.push(eq(Exercise.createdById, filters.createdById))
  }

  if (filters?.isSystem !== undefined) {
    conditions.push(eq(Exercise.isSystem, filters.isSystem))
  }

  if (filters?.search) {
    conditions.push(ilike(Exercise.name, `%${filters.search}%`))
  }

  const query = db.select().from(Exercise).orderBy(asc(Exercise.name))

  if (conditions.length === 1) {
    return query.where(conditions[0])
  }

  if (conditions.length > 1) {
    return query.where(and(...conditions))
  }

  return query
}

export type LoggedExerciseOption = {
  id: string
  name: string
}

/** Distinct exercises the member has logged in completed workouts. */
export function getLoggedExercisesForMember(
  memberId: string
): Promise<LoggedExerciseOption[]> {
  return db
    .selectDistinct({
      id: Exercise.id,
      name: Exercise.name,
    })
    .from(WorkoutLogEntry)
    .innerJoin(WorkoutLog, eq(WorkoutLogEntry.workoutLogId, WorkoutLog.id))
    .innerJoin(Exercise, eq(WorkoutLogEntry.exerciseId, Exercise.id))
    .where(
      and(eq(WorkoutLog.memberId, memberId), eq(WorkoutLog.status, "completed"))
    )
    .orderBy(asc(Exercise.name))
}

/**
 * Workout log entries for an exercise, ordered by session date.
 * Use `actualReps` / `actualWeight` for volume lifted (sets × reps × load)
 * and `actualDurationSeconds` / `actualWeight` for volume duration (sets × duration × load).
 */
export function getExerciseLogEntries(
  memberId: string,
  exerciseId: string
): Promise<ExerciseLogVolumePoint[]> {
  return db
    .select({
      exerciseName: Exercise.name,
      completedAt: WorkoutLog.completedAt,
      actualReps: WorkoutLogEntry.actualReps,
      actualDurationSeconds: WorkoutLogEntry.actualDurationSeconds,
      actualWeight: WorkoutLogEntry.actualWeight,
      roundNumber: WorkoutLogEntry.roundNumber,
      setNumber: WorkoutLogEntry.setNumber,
    })
    .from(WorkoutLogEntry)
    .innerJoin(WorkoutLog, eq(WorkoutLogEntry.workoutLogId, WorkoutLog.id))
    .innerJoin(Exercise, eq(WorkoutLogEntry.exerciseId, Exercise.id))
    .where(
      and(
        eq(WorkoutLog.memberId, memberId),
        eq(WorkoutLogEntry.exerciseId, exerciseId),
        eq(WorkoutLog.status, "completed")
      )
    )
    .orderBy(asc(WorkoutLog.completedAt), asc(WorkoutLogEntry.roundNumber), asc(WorkoutLogEntry.setNumber))
}

export function updateExercise(id: string, input: ExerciseUpdate) {
  return db
    .update(Exercise)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(Exercise.id, id))
    .returning()
}

export async function updateCoachExercise(
  coachId: string,
  exerciseId: string,
  input: ExerciseFormInput
) {
  const exercises = await getOwnedCoachExerciseById(coachId, exerciseId)

  if (!exercises[0]) {
    return null
  }

  return updateExercise(exerciseId, {
    name: input.name,
    description: input.description ?? null,
    muscleGroup: input.muscleGroup,
    planeOfMotion: input.planeOfMotion,
    support: input.support,
    equipment: input.equipment,
  })
}

export function deleteExercise(id: string) {
  return db.delete(Exercise).where(eq(Exercise.id, id)).returning()
}

export type DeleteExerciseResult =
  | { ok: true; exercise: ExerciseSelect }
  | { ok: false; reason: "not_found" | "in_use" | "system" }

export async function deleteCoachExercise(
  coachId: string,
  exerciseId: string
): Promise<DeleteExerciseResult> {
  const accessible = await getCoachExerciseById(coachId, exerciseId)
  const exercise = accessible[0]

  if (!exercise) {
    return { ok: false, reason: "not_found" }
  }

  if (exercise.isSystem || exercise.createdById !== coachId) {
    return { ok: false, reason: "system" }
  }

  try {
    const deleted = await deleteExercise(exerciseId)
    return { ok: true, exercise: deleted[0] }
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23503"
    ) {
      return { ok: false, reason: "in_use" }
    }

    throw error
  }
}
