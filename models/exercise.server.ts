import { and, asc, eq, ilike } from "drizzle-orm"

import db from "../db"
import {
  Exercise,
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
    "name" | "description" | "muscleGroup" | "planeOfMotion" | "support" | "equipment" | "createdById"
  >
>

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
    createdById: coachId,
  })
}

export function getExerciseById(id: string) {
  return db.select().from(Exercise).where(eq(Exercise.id, id))
}

export function getCoachExerciseById(coachId: string, exerciseId: string) {
  return db
    .select()
    .from(Exercise)
    .where(and(eq(Exercise.id, exerciseId), eq(Exercise.createdById, coachId)))
}

export function getCoachExercises(coachId: string, filters?: { search?: string }) {
  const conditions = [eq(Exercise.createdById, coachId)]

  if (filters?.search) {
    conditions.push(ilike(Exercise.name, `%${filters.search}%`))
  }

  return db
    .select()
    .from(Exercise)
    .where(and(...conditions))
    .orderBy(asc(Exercise.name))
}

export function getExercises(filters?: { createdById?: string; search?: string }) {
  const conditions = []

  if (filters?.createdById) {
    conditions.push(eq(Exercise.createdById, filters.createdById))
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
  const exercises = await getCoachExerciseById(coachId, exerciseId)

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
  | { ok: false; reason: "not_found" | "in_use" }

export async function deleteCoachExercise(
  coachId: string,
  exerciseId: string
): Promise<DeleteExerciseResult> {
  const exercises = await getCoachExerciseById(coachId, exerciseId)
  const exercise = exercises[0]

  if (!exercise) {
    return { ok: false, reason: "not_found" }
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
