import { and, asc, desc, eq, inArray } from "drizzle-orm"

import db from "../db"
import {
  Exercise,
  Workout,
  WorkoutBlock,
  WorkoutBlockExercise,
  WorkoutLog,
  WorkoutLogEntry,
} from "../db/schema"

export type WorkoutInsert = typeof Workout.$inferInsert
export type WorkoutUpdate = Partial<
  Pick<WorkoutInsert, "workoutDate" | "style" | "title" | "notes">
>
export type WorkoutSelect = typeof Workout.$inferSelect

export type WorkoutBlockInsert = typeof WorkoutBlock.$inferInsert
export type WorkoutBlockUpdate = Partial<
  Omit<WorkoutBlockInsert, "id" | "workoutId">
>
export type WorkoutBlockSelect = typeof WorkoutBlock.$inferSelect

export type WorkoutBlockExerciseInsert = typeof WorkoutBlockExercise.$inferInsert
export type WorkoutBlockExerciseUpdate = Partial<
  Omit<WorkoutBlockExerciseInsert, "id" | "blockId" | "exerciseId">
>
export type WorkoutBlockExerciseSelect = typeof WorkoutBlockExercise.$inferSelect

export type WorkoutLogInsert = typeof WorkoutLog.$inferInsert
export type WorkoutLogUpdate = Partial<
  Pick<WorkoutLogInsert, "completedAt" | "notes" | "workoutId">
>
export type WorkoutLogSelect = typeof WorkoutLog.$inferSelect

export type WorkoutLogEntryInsert = typeof WorkoutLogEntry.$inferInsert
export type WorkoutLogEntryUpdate = Partial<
  Omit<WorkoutLogEntryInsert, "id" | "workoutLogId" | "exerciseId">
>
export type WorkoutLogEntrySelect = typeof WorkoutLogEntry.$inferSelect

type ExerciseSelect = typeof Exercise.$inferSelect

export type WorkoutBlockExerciseInput = Omit<
  WorkoutBlockExerciseInsert,
  "id" | "blockId"
>

export type WorkoutBlockInput = Omit<WorkoutBlockInsert, "id" | "workoutId"> & {
  exercises?: WorkoutBlockExerciseInput[]
}

export type CreateWorkoutInput = Omit<
  WorkoutInsert,
  "id" | "createdAt" | "updatedAt"
> & {
  blocks?: WorkoutBlockInput[]
}

export type WorkoutLogEntryInput = Omit<
  WorkoutLogEntryInsert,
  "id" | "workoutLogId"
>

export type CreateWorkoutLogInput = Omit<
  WorkoutLogInsert,
  "id" | "createdAt"
> & {
  entries?: WorkoutLogEntryInput[]
}

export type WorkoutBlockWithExercises = WorkoutBlockSelect & {
  exercises: (WorkoutBlockExerciseSelect & { exercise: ExerciseSelect })[]
}

export type WorkoutWithDetails = WorkoutSelect & {
  blocks: WorkoutBlockWithExercises[]
}

export type WorkoutLogWithEntries = WorkoutLogSelect & {
  entries: (WorkoutLogEntrySelect & { exercise: ExerciseSelect })[]
}

export type ExerciseProgressionPoint = {
  completedAt: Date
  actualWeight: number | null
  actualReps: number | null
  actualDurationSeconds: number | null
  actualRpe: number | null
  roundNumber: number
  setNumber: number | null
}

// --- Workout CRUD ---

export async function createWorkout(input: CreateWorkoutInput) {
  const now = new Date()
  const { blocks, ...workoutInput } = input

  return db.transaction(async (tx) => {
    const [workout] = await tx
      .insert(Workout)
      .values({
        ...workoutInput,
        updatedAt: now,
      })
      .returning()

    if (blocks?.length) {
      for (const blockInput of blocks) {
        const { exercises, ...blockFields } = blockInput

        const [block] = await tx
          .insert(WorkoutBlock)
          .values({
            ...blockFields,
            workoutId: workout.id,
          })
          .returning()

        if (exercises?.length) {
          await tx.insert(WorkoutBlockExercise).values(
            exercises.map((exercise) => ({
              ...exercise,
              blockId: block.id,
            }))
          )
        }
      }
    }

    return workout
  })
}

export function getWorkoutById(id: string) {
  return db.select().from(Workout).where(eq(Workout.id, id))
}

export function getWorkoutsByCoach(coachId: string) {
  return db
    .select()
    .from(Workout)
    .where(eq(Workout.coachId, coachId))
    .orderBy(desc(Workout.workoutDate))
}

export function getWorkoutsByMember(memberId: string) {
  return db
    .select()
    .from(Workout)
    .where(eq(Workout.memberId, memberId))
    .orderBy(desc(Workout.workoutDate))
}

export function getWorkoutsByCoachAndMember(coachId: string, memberId: string) {
  return db
    .select()
    .from(Workout)
    .where(and(eq(Workout.coachId, coachId), eq(Workout.memberId, memberId)))
    .orderBy(desc(Workout.workoutDate))
}

export function updateWorkout(id: string, input: WorkoutUpdate) {
  return db
    .update(Workout)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(Workout.id, id))
    .returning()
}

export function deleteWorkout(id: string) {
  return db.delete(Workout).where(eq(Workout.id, id)).returning()
}

export async function getWorkoutWithDetails(workoutId: string): Promise<WorkoutWithDetails | null> {
  const workouts = await getWorkoutById(workoutId)
  const workout = workouts[0]
  if (!workout) {
    return null
  }

  const blocks = await db
    .select()
    .from(WorkoutBlock)
    .where(eq(WorkoutBlock.workoutId, workoutId))
    .orderBy(asc(WorkoutBlock.orderIndex))

  if (blocks.length === 0) {
    return { ...workout, blocks: [] }
  }

  const blockIds = blocks.map((block) => block.id)
  const blockExercises = await db
    .select({
      blockExercise: WorkoutBlockExercise,
      exercise: Exercise,
    })
    .from(WorkoutBlockExercise)
    .innerJoin(Exercise, eq(WorkoutBlockExercise.exerciseId, Exercise.id))
    .where(inArray(WorkoutBlockExercise.blockId, blockIds))
    .orderBy(asc(WorkoutBlockExercise.orderIndex))

  const exercisesByBlockId = new Map<string, WorkoutBlockWithExercises["exercises"]>()

  for (const row of blockExercises) {
    const existing = exercisesByBlockId.get(row.blockExercise.blockId) ?? []
    existing.push({
      ...row.blockExercise,
      exercise: row.exercise,
    })
    exercisesByBlockId.set(row.blockExercise.blockId, existing)
  }

  return {
    ...workout,
    blocks: blocks.map((block) => ({
      ...block,
      exercises: exercisesByBlockId.get(block.id) ?? [],
    })),
  }
}

// --- WorkoutBlock CRUD ---

export function createWorkoutBlock(input: Omit<WorkoutBlockInsert, "id">) {
  return db.insert(WorkoutBlock).values(input).returning()
}

export function getWorkoutBlockById(id: string) {
  return db.select().from(WorkoutBlock).where(eq(WorkoutBlock.id, id))
}

export function getWorkoutBlocksByWorkoutId(workoutId: string) {
  return db
    .select()
    .from(WorkoutBlock)
    .where(eq(WorkoutBlock.workoutId, workoutId))
    .orderBy(asc(WorkoutBlock.orderIndex))
}

export function updateWorkoutBlock(id: string, input: WorkoutBlockUpdate) {
  return db
    .update(WorkoutBlock)
    .set(input)
    .where(eq(WorkoutBlock.id, id))
    .returning()
}

export function deleteWorkoutBlock(id: string) {
  return db.delete(WorkoutBlock).where(eq(WorkoutBlock.id, id)).returning()
}

// --- WorkoutBlockExercise CRUD ---

export function createWorkoutBlockExercise(
  input: Omit<WorkoutBlockExerciseInsert, "id">
) {
  return db.insert(WorkoutBlockExercise).values(input).returning()
}

export function getWorkoutBlockExerciseById(id: string) {
  return db
    .select()
    .from(WorkoutBlockExercise)
    .where(eq(WorkoutBlockExercise.id, id))
}

export function getWorkoutBlockExercisesByBlockId(blockId: string) {
  return db
    .select()
    .from(WorkoutBlockExercise)
    .where(eq(WorkoutBlockExercise.blockId, blockId))
    .orderBy(asc(WorkoutBlockExercise.orderIndex))
}

export function updateWorkoutBlockExercise(
  id: string,
  input: WorkoutBlockExerciseUpdate
) {
  return db
    .update(WorkoutBlockExercise)
    .set(input)
    .where(eq(WorkoutBlockExercise.id, id))
    .returning()
}

export function deleteWorkoutBlockExercise(id: string) {
  return db
    .delete(WorkoutBlockExercise)
    .where(eq(WorkoutBlockExercise.id, id))
    .returning()
}

// --- WorkoutLog CRUD ---

export async function createWorkoutLog(input: CreateWorkoutLogInput) {
  const { entries, ...logInput } = input

  return db.transaction(async (tx) => {
    const [workoutLog] = await tx.insert(WorkoutLog).values(logInput).returning()

    if (entries?.length) {
      await tx.insert(WorkoutLogEntry).values(
        entries.map((entry) => ({
          ...entry,
          workoutLogId: workoutLog.id,
        }))
      )
    }

    return workoutLog
  })
}

export function getWorkoutLogById(id: string) {
  return db.select().from(WorkoutLog).where(eq(WorkoutLog.id, id))
}

export function getWorkoutLogsByMember(memberId: string) {
  return db
    .select()
    .from(WorkoutLog)
    .where(eq(WorkoutLog.memberId, memberId))
    .orderBy(desc(WorkoutLog.completedAt))
}

export function getWorkoutLogsByCoach(coachId: string) {
  return db
    .select()
    .from(WorkoutLog)
    .where(eq(WorkoutLog.coachId, coachId))
    .orderBy(desc(WorkoutLog.completedAt))
}

export function getWorkoutLogsByWorkout(workoutId: string) {
  return db
    .select()
    .from(WorkoutLog)
    .where(eq(WorkoutLog.workoutId, workoutId))
    .orderBy(desc(WorkoutLog.completedAt))
}

export function updateWorkoutLog(id: string, input: WorkoutLogUpdate) {
  return db
    .update(WorkoutLog)
    .set(input)
    .where(eq(WorkoutLog.id, id))
    .returning()
}

export function deleteWorkoutLog(id: string) {
  return db.delete(WorkoutLog).where(eq(WorkoutLog.id, id)).returning()
}

export async function getWorkoutLogWithEntries(
  logId: string
): Promise<WorkoutLogWithEntries | null> {
  const logs = await getWorkoutLogById(logId)
  const workoutLog = logs[0]
  if (!workoutLog) {
    return null
  }

  const entries = await db
    .select({
      entry: WorkoutLogEntry,
      exercise: Exercise,
    })
    .from(WorkoutLogEntry)
    .innerJoin(Exercise, eq(WorkoutLogEntry.exerciseId, Exercise.id))
    .where(eq(WorkoutLogEntry.workoutLogId, logId))
    .orderBy(asc(WorkoutLogEntry.roundNumber), asc(WorkoutLogEntry.setNumber))

  return {
    ...workoutLog,
    entries: entries.map((row) => ({
      ...row.entry,
      exercise: row.exercise,
    })),
  }
}

// --- WorkoutLogEntry CRUD ---

export function createWorkoutLogEntry(input: Omit<WorkoutLogEntryInsert, "id">) {
  return db.insert(WorkoutLogEntry).values(input).returning()
}

export function getWorkoutLogEntryById(id: string) {
  return db.select().from(WorkoutLogEntry).where(eq(WorkoutLogEntry.id, id))
}

export function getWorkoutLogEntriesByLogId(workoutLogId: string) {
  return db
    .select()
    .from(WorkoutLogEntry)
    .where(eq(WorkoutLogEntry.workoutLogId, workoutLogId))
    .orderBy(asc(WorkoutLogEntry.roundNumber), asc(WorkoutLogEntry.setNumber))
}

export function updateWorkoutLogEntry(id: string, input: WorkoutLogEntryUpdate) {
  return db
    .update(WorkoutLogEntry)
    .set(input)
    .where(eq(WorkoutLogEntry.id, id))
    .returning()
}

export function deleteWorkoutLogEntry(id: string) {
  return db.delete(WorkoutLogEntry).where(eq(WorkoutLogEntry.id, id)).returning()
}

// --- Progression / analytics ---

export function getExerciseProgression(
  memberId: string,
  exerciseId: string
): Promise<ExerciseProgressionPoint[]> {
  return db
    .select({
      completedAt: WorkoutLog.completedAt,
      actualWeight: WorkoutLogEntry.actualWeight,
      actualReps: WorkoutLogEntry.actualReps,
      actualDurationSeconds: WorkoutLogEntry.actualDurationSeconds,
      actualRpe: WorkoutLogEntry.actualRpe,
      roundNumber: WorkoutLogEntry.roundNumber,
      setNumber: WorkoutLogEntry.setNumber,
    })
    .from(WorkoutLogEntry)
    .innerJoin(WorkoutLog, eq(WorkoutLogEntry.workoutLogId, WorkoutLog.id))
    .where(
      and(eq(WorkoutLog.memberId, memberId), eq(WorkoutLogEntry.exerciseId, exerciseId))
    )
    .orderBy(asc(WorkoutLog.completedAt))
}
