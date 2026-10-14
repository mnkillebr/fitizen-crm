import { and, asc, desc, eq, inArray } from "drizzle-orm"

import db from "../db"
import {
  Exercise,
  WorkoutTemplate,
  WorkoutTemplateBlock,
  WorkoutTemplateBlockExercise,
} from "../db/schema"
import type { WorkoutBuilderPayload } from "../app/lib/workout-builder"
import type { WorkoutLogEntryPayload } from "../app/lib/workout-log-form"
import { getCoachClientById } from "./client.server"
import { createWorkout, type WorkoutWithDetails } from "./workout.server"

export type WorkoutTemplateSelect = typeof WorkoutTemplate.$inferSelect
export type WorkoutTemplateBlockSelect = typeof WorkoutTemplateBlock.$inferSelect
export type WorkoutTemplateBlockExerciseSelect =
  typeof WorkoutTemplateBlockExercise.$inferSelect

type ExerciseSelect = typeof Exercise.$inferSelect

export type TemplateBlockWithExercises = WorkoutTemplateBlockSelect & {
  exercises: (WorkoutTemplateBlockExerciseSelect & { exercise: ExerciseSelect })[]
}

export type WorkoutTemplateWithDetails = WorkoutTemplateSelect & {
  blocks: TemplateBlockWithExercises[]
}

function mapPayloadToBlocks(payload: WorkoutBuilderPayload) {
  return payload.blocks.map((block) => ({
    blockType: block.blockType,
    orderIndex: block.orderIndex,
    name: block.name ?? null,
    rounds: block.rounds ?? null,
    restBetweenRoundsSeconds: block.restBetweenRoundsSeconds ?? null,
    workDurationSeconds: block.workDurationSeconds ?? null,
    restDurationSeconds: block.restDurationSeconds ?? null,
    targetDurationSeconds: block.targetDurationSeconds ?? null,
    targetIntensity: block.targetIntensity ?? null,
    notes: block.notes ?? null,
    exercises: block.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      orderIndex: exercise.orderIndex,
      prescriptionMode: exercise.prescriptionMode,
      targetReps: exercise.targetReps ?? null,
      targetDurationSeconds: exercise.targetDurationSeconds ?? null,
      targetRpe: exercise.targetRpe ?? null,
      targetWeight: exercise.targetWeight ?? null,
      tempo: exercise.tempo ?? null,
      cue1: exercise.cue1 ?? null,
      cue2: exercise.cue2 ?? null,
      cue3: exercise.cue3 ?? null,
      restAfterSeconds: exercise.restAfterSeconds ?? null,
    })),
  }))
}

async function insertTemplateBlocks(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  templateId: string,
  blocks: ReturnType<typeof mapPayloadToBlocks>
) {
  for (const blockInput of blocks) {
    const { exercises, ...blockFields } = blockInput

    const [block] = await tx
      .insert(WorkoutTemplateBlock)
      .values({
        ...blockFields,
        templateId,
      })
      .returning()

    if (exercises.length) {
      await tx.insert(WorkoutTemplateBlockExercise).values(
        exercises.map((exercise) => ({
          ...exercise,
          blockId: block.id,
        }))
      )
    }
  }
}

export async function createWorkoutTemplate(coachId: string, payload: WorkoutBuilderPayload) {
  const now = new Date()
  const blocks = mapPayloadToBlocks(payload)

  return db.transaction(async (tx) => {
    const [template] = await tx
      .insert(WorkoutTemplate)
      .values({
        coachId,
        style: payload.style,
        title: payload.title,
        notes: payload.notes ?? null,
        updatedAt: now,
      })
      .returning()

    await insertTemplateBlocks(tx, template.id, blocks)

    return template
  })
}

function resolveLoggedExerciseId(
  blockExerciseId: string,
  plannedExerciseId: string,
  entries: WorkoutLogEntryPayload[]
) {
  const matching = entries.filter(
    (entry) => entry.blockExerciseId === blockExerciseId
  )

  if (matching.length === 0) {
    return plannedExerciseId
  }

  const counts = new Map<string, { count: number; maxRound: number }>()

  for (const entry of matching) {
    const current = counts.get(entry.exerciseId) ?? { count: 0, maxRound: 0 }
    current.count += 1
    current.maxRound = Math.max(current.maxRound, entry.roundNumber)
    counts.set(entry.exerciseId, current)
  }

  let winnerId = plannedExerciseId
  let winnerCount = -1
  let winnerMaxRound = -1

  for (const [exerciseId, stats] of counts) {
    if (
      stats.count > winnerCount ||
      (stats.count === winnerCount && stats.maxRound > winnerMaxRound)
    ) {
      winnerId = exerciseId
      winnerCount = stats.count
      winnerMaxRound = stats.maxRound
    }
  }

  return winnerId
}

/** Snapshot an assigned workout as a template, using majority logged exerciseIds per slot. */
export async function createWorkoutTemplateFromLoggedWorkout(
  coachId: string,
  workout: WorkoutWithDetails,
  entries: WorkoutLogEntryPayload[],
  title: string
) {
  const payload: WorkoutBuilderPayload = {
    style: workout.style,
    title: title.trim() || `${workout.title ?? "Workout"} (modified)`,
    notes: workout.notes ?? undefined,
    blocks: workout.blocks.map((block) => ({
      blockType: block.blockType,
      orderIndex: block.orderIndex,
      name: block.name ?? undefined,
      rounds: block.rounds ?? undefined,
      restBetweenRoundsSeconds: block.restBetweenRoundsSeconds ?? undefined,
      workDurationSeconds: block.workDurationSeconds ?? undefined,
      restDurationSeconds: block.restDurationSeconds ?? undefined,
      targetDurationSeconds: block.targetDurationSeconds ?? undefined,
      targetIntensity: block.targetIntensity ?? undefined,
      notes: block.notes ?? undefined,
      exercises: block.exercises.map((exercise) => ({
        exerciseId: resolveLoggedExerciseId(
          exercise.id,
          exercise.exerciseId,
          entries
        ),
        orderIndex: exercise.orderIndex,
        prescriptionMode: exercise.prescriptionMode,
        targetReps: exercise.targetReps ?? undefined,
        targetDurationSeconds: exercise.targetDurationSeconds ?? undefined,
        targetRpe: exercise.targetRpe ?? undefined,
        targetWeight: exercise.targetWeight ?? undefined,
        tempo: exercise.tempo ?? undefined,
        cue1: exercise.cue1 ?? undefined,
        cue2: exercise.cue2 ?? undefined,
        cue3: exercise.cue3 ?? undefined,
        restAfterSeconds: exercise.restAfterSeconds ?? undefined,
      })),
    })),
  }

  return createWorkoutTemplate(coachId, payload)
}

export function getCoachWorkoutTemplates(coachId: string) {
  return db
    .select()
    .from(WorkoutTemplate)
    .where(eq(WorkoutTemplate.coachId, coachId))
    .orderBy(desc(WorkoutTemplate.updatedAt))
}

export function getCoachTemplateById(coachId: string, templateId: string) {
  return db
    .select()
    .from(WorkoutTemplate)
    .where(
      and(eq(WorkoutTemplate.id, templateId), eq(WorkoutTemplate.coachId, coachId))
    )
}

export async function getTemplateWithDetails(
  coachId: string,
  templateId: string
): Promise<WorkoutTemplateWithDetails | null> {
  const templates = await getCoachTemplateById(coachId, templateId)
  const template = templates[0]

  if (!template) {
    return null
  }

  const blocks = await db
    .select()
    .from(WorkoutTemplateBlock)
    .where(eq(WorkoutTemplateBlock.templateId, templateId))
    .orderBy(asc(WorkoutTemplateBlock.orderIndex))

  if (blocks.length === 0) {
    return { ...template, blocks: [] }
  }

  const blockIds = blocks.map((block) => block.id)
  const blockExercises = await db
    .select({
      blockExercise: WorkoutTemplateBlockExercise,
      exercise: Exercise,
    })
    .from(WorkoutTemplateBlockExercise)
    .innerJoin(Exercise, eq(WorkoutTemplateBlockExercise.exerciseId, Exercise.id))
    .where(inArray(WorkoutTemplateBlockExercise.blockId, blockIds))
    .orderBy(asc(WorkoutTemplateBlockExercise.orderIndex))

  const exercisesByBlockId = new Map<string, TemplateBlockWithExercises["exercises"]>()

  for (const row of blockExercises) {
    const existing = exercisesByBlockId.get(row.blockExercise.blockId) ?? []
    existing.push({
      ...row.blockExercise,
      exercise: row.exercise,
    })
    exercisesByBlockId.set(row.blockExercise.blockId, existing)
  }

  return {
    ...template,
    blocks: blocks.map((block) => ({
      ...block,
      exercises: exercisesByBlockId.get(block.id) ?? [],
    })),
  }
}

export async function updateWorkoutTemplate(
  coachId: string,
  templateId: string,
  payload: WorkoutBuilderPayload
) {
  const templates = await getCoachTemplateById(coachId, templateId)
  const template = templates[0]

  if (!template) {
    return null
  }

  const blocks = mapPayloadToBlocks(payload)

  return db.transaction(async (tx) => {
    const [updatedTemplate] = await tx
      .update(WorkoutTemplate)
      .set({
        style: payload.style,
        title: payload.title,
        notes: payload.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(WorkoutTemplate.id, templateId))
      .returning()

    await tx
      .delete(WorkoutTemplateBlock)
      .where(eq(WorkoutTemplateBlock.templateId, templateId))

    await insertTemplateBlocks(tx, templateId, blocks)

    return updatedTemplate
  })
}

export async function deleteCoachTemplate(coachId: string, templateId: string) {
  const templates = await getCoachTemplateById(coachId, templateId)
  const template = templates[0]

  if (!template) {
    return { ok: false as const, reason: "not_found" as const }
  }

  const deleted = await db
    .delete(WorkoutTemplate)
    .where(eq(WorkoutTemplate.id, templateId))
    .returning()

  return { ok: true as const, template: deleted[0] }
}

export type AssignTemplateResult =
  | { ok: true; workoutId: string }
  | { ok: false; reason: "not_found" | "client_not_found" }

export async function assignTemplateToClient(
  coachId: string,
  templateId: string,
  memberId: string,
  workoutDate: Date
): Promise<AssignTemplateResult> {
  const template = await getTemplateWithDetails(coachId, templateId)

  if (!template) {
    return { ok: false, reason: "not_found" }
  }

  const client = await getCoachClientById(coachId, memberId)

  if (!client) {
    return { ok: false, reason: "client_not_found" }
  }

  const workout = await createWorkout({
    coachId,
    memberId,
    workoutDate,
    style: template.style,
    status: "scheduled",
    title: template.title,
    notes: template.notes,
    blocks: template.blocks.map((block) => ({
      blockType: block.blockType,
      orderIndex: block.orderIndex,
      name: block.name,
      rounds: block.rounds,
      restBetweenRoundsSeconds: block.restBetweenRoundsSeconds,
      workDurationSeconds: block.workDurationSeconds,
      restDurationSeconds: block.restDurationSeconds,
      targetDurationSeconds: block.targetDurationSeconds,
      targetIntensity: block.targetIntensity,
      notes: block.notes,
      exercises: block.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        orderIndex: exercise.orderIndex,
        prescriptionMode: exercise.prescriptionMode,
        targetReps: exercise.targetReps,
        targetDurationSeconds: exercise.targetDurationSeconds,
        targetRpe: exercise.targetRpe,
        targetWeight: exercise.targetWeight,
        tempo: exercise.tempo,
        cue1: exercise.cue1,
        cue2: exercise.cue2,
        cue3: exercise.cue3,
        restAfterSeconds: exercise.restAfterSeconds,
      })),
    })),
  })

  return { ok: true, workoutId: workout.id }
}
