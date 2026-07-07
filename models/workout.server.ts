import { and, asc, desc, eq, inArray, or } from "drizzle-orm"

import db from "../db"
import type { WorkoutLogEntryPayload } from "../app/lib/workout-log-form"
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
  Pick<WorkoutInsert, "workoutDate" | "style" | "title" | "notes" | "status">
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
  Pick<
    WorkoutLogInsert,
    "completedAt" | "notes" | "workoutId" | "status" | "startedAt" | "updatedAt"
  >
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
  "id" | "createdAt" | "updatedAt"
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
  completedAt: Date | null
  actualWeight: number | null
  actualReps: number | null
  actualDurationSeconds: number | null
  actualRpe: number | null
  roundNumber: number
  setNumber: number | null
}

export type UpcomingWorkoutForClient = WorkoutSelect & {
  activeLogId: string | null
}

export type CompletedLogSummary = {
  logId: string
  workoutId: string | null
  title: string | null
  style: WorkoutSelect["style"]
  completedAt: Date
  workoutDate: Date | null
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
  const now = new Date()

  return db.transaction(async (tx) => {
    const [workoutLog] = await tx
      .insert(WorkoutLog)
      .values({
        ...logInput,
        updatedAt: now,
      })
      .returning()

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
    .set({
      ...input,
      updatedAt: new Date(),
    })
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
      and(
        eq(WorkoutLog.memberId, memberId),
        eq(WorkoutLogEntry.exerciseId, exerciseId),
        eq(WorkoutLog.status, "completed")
      )
    )
    .orderBy(asc(WorkoutLog.completedAt))
}

// --- Client dashboard & log lifecycle ---

export async function getCoachWorkoutForClient(
  coachId: string,
  memberId: string,
  workoutId: string
): Promise<WorkoutWithDetails | null> {
  const workouts = await db
    .select()
    .from(Workout)
    .where(
      and(
        eq(Workout.id, workoutId),
        eq(Workout.coachId, coachId),
        eq(Workout.memberId, memberId)
      )
    )

  if (!workouts[0]) {
    return null
  }

  return getWorkoutWithDetails(workoutId)
}

export async function getUpcomingWorkoutForClient(
  coachId: string,
  memberId: string
): Promise<UpcomingWorkoutForClient | null> {
  const workouts = await db
    .select()
    .from(Workout)
    .where(
      and(
        eq(Workout.coachId, coachId),
        eq(Workout.memberId, memberId),
        or(eq(Workout.status, "scheduled"), eq(Workout.status, "in_progress"))
      )
    )
    .orderBy(asc(Workout.workoutDate))
    .limit(1)

  const workout = workouts[0]
  if (!workout) {
    return null
  }

  let activeLogId: string | null = null
  if (workout.status === "in_progress") {
    const activeLogs = await getActiveLogForWorkout(workout.id)
    activeLogId = activeLogs[0]?.id ?? null
  }

  return { ...workout, activeLogId }
}

export async function getPreviousCompletedLogForClient(
  coachId: string,
  memberId: string
): Promise<CompletedLogSummary | null> {
  const rows = await db
    .select({
      logId: WorkoutLog.id,
      workoutId: WorkoutLog.workoutId,
      title: Workout.title,
      style: Workout.style,
      completedAt: WorkoutLog.completedAt,
      workoutDate: Workout.workoutDate,
    })
    .from(WorkoutLog)
    .leftJoin(Workout, eq(WorkoutLog.workoutId, Workout.id))
    .where(
      and(
        eq(WorkoutLog.coachId, coachId),
        eq(WorkoutLog.memberId, memberId),
        eq(WorkoutLog.status, "completed")
      )
    )
    .orderBy(desc(WorkoutLog.completedAt))
    .limit(1)

  const row = rows[0]
  if (!row?.completedAt) {
    return null
  }

  return {
    logId: row.logId,
    workoutId: row.workoutId,
    title: row.title,
    style: row.style ?? "strength_circuit",
    completedAt: row.completedAt,
    workoutDate: row.workoutDate,
  }
}

export async function getCompletedLogsForClient(
  coachId: string,
  memberId: string
): Promise<CompletedLogSummary[]> {
  const rows = await db
    .select({
      logId: WorkoutLog.id,
      workoutId: WorkoutLog.workoutId,
      title: Workout.title,
      style: Workout.style,
      completedAt: WorkoutLog.completedAt,
      workoutDate: Workout.workoutDate,
    })
    .from(WorkoutLog)
    .leftJoin(Workout, eq(WorkoutLog.workoutId, Workout.id))
    .where(
      and(
        eq(WorkoutLog.coachId, coachId),
        eq(WorkoutLog.memberId, memberId),
        eq(WorkoutLog.status, "completed")
      )
    )
    .orderBy(desc(WorkoutLog.completedAt))

  return rows
    .filter((row): row is typeof row & { completedAt: Date } => row.completedAt !== null)
    .map((row) => ({
      logId: row.logId,
      workoutId: row.workoutId,
      title: row.title,
      style: row.style ?? "strength_circuit",
      completedAt: row.completedAt,
      workoutDate: row.workoutDate,
    }))
}

export function getActiveLogForWorkout(workoutId: string) {
  return db
    .select()
    .from(WorkoutLog)
    .where(and(eq(WorkoutLog.workoutId, workoutId), eq(WorkoutLog.status, "in_progress")))
}

export async function getCoachWorkoutLog(
  coachId: string,
  memberId: string,
  logId: string
) {
  const logs = await db
    .select()
    .from(WorkoutLog)
    .where(
      and(
        eq(WorkoutLog.id, logId),
        eq(WorkoutLog.coachId, coachId),
        eq(WorkoutLog.memberId, memberId)
      )
    )

  return logs[0] ?? null
}

export async function startWorkoutLog(
  coachId: string,
  memberId: string,
  workoutId: string,
  loggedById: string
) {
  const workout = await getCoachWorkoutForClient(coachId, memberId, workoutId)
  if (!workout) {
    return null
  }

  if (workout.status === "completed" || workout.status === "no_show") {
    return null
  }

  const existing = await getActiveLogForWorkout(workoutId)
  if (existing[0]) {
    return existing[0]
  }

  const now = new Date()

  return db.transaction(async (tx) => {
    const [log] = await tx
      .insert(WorkoutLog)
      .values({
        workoutId,
        coachId,
        memberId,
        loggedById,
        status: "in_progress",
        startedAt: now,
        updatedAt: now,
      })
      .returning()

    await tx
      .update(Workout)
      .set({ status: "in_progress", updatedAt: now })
      .where(eq(Workout.id, workoutId))

    return log
  })
}

function mapLogEntries(logId: string, entries: WorkoutLogEntryPayload[]) {
  return entries.map((entry) => ({
    workoutLogId: logId,
    blockExerciseId: entry.blockExerciseId,
    exerciseId: entry.exerciseId,
    roundNumber: entry.roundNumber,
    setNumber: entry.setNumber ?? null,
    actualReps: entry.actualReps ?? null,
    actualDurationSeconds: entry.actualDurationSeconds ?? null,
    actualRpe: entry.actualRpe ?? null,
    actualWeight: entry.actualWeight ?? null,
    notes: entry.notes ?? null,
  }))
}

export async function completeWorkoutLog(
  coachId: string,
  logId: string,
  entries: WorkoutLogEntryPayload[],
  notes?: string
) {
  const log = await getCoachWorkoutLogById(coachId, logId)
  if (!log || log.status !== "in_progress" || !log.workoutId) {
    return null
  }

  const now = new Date()

  return db.transaction(async (tx) => {
    await tx.delete(WorkoutLogEntry).where(eq(WorkoutLogEntry.workoutLogId, logId))

    if (entries.length) {
      await tx.insert(WorkoutLogEntry).values(mapLogEntries(logId, entries))
    }

    const [updatedLog] = await tx
      .update(WorkoutLog)
      .set({
        status: "completed",
        completedAt: now,
        notes: notes ?? null,
        updatedAt: now,
      })
      .where(eq(WorkoutLog.id, logId))
      .returning()

    await tx
      .update(Workout)
      .set({ status: "completed", updatedAt: now })
      .where(eq(Workout.id, log.workoutId!))

    return updatedLog
  })
}

async function getCoachWorkoutLogById(coachId: string, logId: string) {
  const logs = await db
    .select()
    .from(WorkoutLog)
    .where(and(eq(WorkoutLog.id, logId), eq(WorkoutLog.coachId, coachId)))

  return logs[0] ?? null
}

export async function cancelWorkoutLog(coachId: string, logId: string) {
  const log = await getCoachWorkoutLogById(coachId, logId)
  if (!log || log.status !== "in_progress" || !log.workoutId) {
    return null
  }

  const now = new Date()

  return db.transaction(async (tx) => {
    const [updatedLog] = await tx
      .update(WorkoutLog)
      .set({
        status: "cancelled",
        updatedAt: now,
      })
      .where(eq(WorkoutLog.id, logId))
      .returning()

    await tx
      .update(Workout)
      .set({ status: "scheduled", updatedAt: now })
      .where(eq(Workout.id, log.workoutId!))

    return updatedLog
  })
}

export async function rescheduleWorkout(
  coachId: string,
  memberId: string,
  workoutId: string,
  newDate: Date
) {
  const workout = await getCoachWorkoutForClient(coachId, memberId, workoutId)
  if (!workout) {
    return null
  }

  if (workout.status === "completed") {
    return null
  }

  if (workout.status === "in_progress") {
    const activeLog = await getActiveLogForWorkout(workoutId)
    if (activeLog[0]) {
      await cancelWorkoutLog(coachId, activeLog[0].id)
    }
  }

  const now = new Date()

  const [updated] = await db
    .update(Workout)
    .set({
      workoutDate: newDate,
      status: "scheduled",
      updatedAt: now,
    })
    .where(eq(Workout.id, workoutId))
    .returning()

  return updated
}

export async function markWorkoutNoShow(
  coachId: string,
  memberId: string,
  workoutId: string,
  loggedById: string
) {
  const workout = await getCoachWorkoutForClient(coachId, memberId, workoutId)
  if (!workout) {
    return null
  }

  if (workout.status === "completed") {
    return null
  }

  const now = new Date()

  return db.transaction(async (tx) => {
    const activeLogs = await tx
      .select()
      .from(WorkoutLog)
      .where(and(eq(WorkoutLog.workoutId, workoutId), eq(WorkoutLog.status, "in_progress")))

    if (activeLogs[0]) {
      await tx
        .update(WorkoutLog)
        .set({ status: "cancelled", updatedAt: now })
        .where(eq(WorkoutLog.id, activeLogs[0].id))
    }

    const [log] = await tx
      .insert(WorkoutLog)
      .values({
        workoutId,
        coachId,
        memberId,
        loggedById,
        status: "no_show",
        startedAt: now,
        completedAt: now,
        updatedAt: now,
      })
      .returning()

    await tx
      .update(Workout)
      .set({ status: "no_show", updatedAt: now })
      .where(eq(Workout.id, workoutId))

    return log
  })
}

export async function updateCompletedWorkoutLog(
  coachId: string,
  memberId: string,
  logId: string,
  entries: WorkoutLogEntryPayload[],
  notes?: string
) {
  const log = await getCoachWorkoutLog(coachId, memberId, logId)
  if (!log || log.status !== "completed") {
    return null
  }

  const now = new Date()

  return db.transaction(async (tx) => {
    await tx.delete(WorkoutLogEntry).where(eq(WorkoutLogEntry.workoutLogId, logId))

    if (entries.length) {
      await tx.insert(WorkoutLogEntry).values(mapLogEntries(logId, entries))
    }

    const [updatedLog] = await tx
      .update(WorkoutLog)
      .set({
        notes: notes ?? null,
        updatedAt: now,
      })
      .where(eq(WorkoutLog.id, logId))
      .returning()

    return updatedLog
  })
}
