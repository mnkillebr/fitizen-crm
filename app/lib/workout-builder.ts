import { z } from "zod"

import {
  ExercisePrescriptionMode,
  WorkoutBlockType,
  WorkoutStyle,
} from "../../db/schema"

export const workoutStyleValues = WorkoutStyle.enumValues
export const workoutBlockTypeValues = WorkoutBlockType.enumValues
export const prescriptionModeValues = ExercisePrescriptionMode.enumValues

export type WorkoutStyleValue = (typeof workoutStyleValues)[number]
export type WorkoutBlockTypeValue = (typeof workoutBlockTypeValues)[number]
export type PrescriptionModeValue = (typeof prescriptionModeValues)[number]

export const workoutStyleLabels: Record<WorkoutStyleValue, string> = {
  strength_circuit: "Strength circuit",
  hiit: "HIIT",
  cardio: "Cardio",
}

export const workoutBlockTypeLabels: Record<WorkoutBlockTypeValue, string> = {
  circuit: "Circuit",
  interval: "Interval",
  segment: "Segment",
}

export const prescriptionModeLabels: Record<PrescriptionModeValue, string> = {
  reps: "Reps",
  time: "Time",
}

export function blockTypeForStyle(style: WorkoutStyleValue): WorkoutBlockTypeValue {
  switch (style) {
    case "strength_circuit":
      return "circuit"
    case "hiit":
      return "interval"
    case "cardio":
      return "segment"
  }
}

export function defaultBlockName(
  style: WorkoutStyleValue,
  orderIndex: number
): string {
  const label = workoutBlockTypeLabels[blockTypeForStyle(style)]
  return `${label} ${orderIndex + 1}`
}

const optionalInt = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
  z.number().int().positive().optional()
)

const optionalFloat = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
  z.number().positive().optional()
)

const optionalString = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return undefined
    const trimmed = String(value).trim()
    return trimmed === "" ? undefined : trimmed
  },
  z.string().optional()
)

export const builderBlockExerciseSchema = z
  .object({
    exerciseId: z.string().uuid(),
    orderIndex: z.number().int().min(0),
    prescriptionMode: z.enum(prescriptionModeValues),
    targetReps: optionalInt,
    targetDurationSeconds: optionalInt,
    targetRpe: z.preprocess(
      (value) =>
        value === "" || value === null || value === undefined ? undefined : Number(value),
      z.number().int().min(1).max(10).optional()
    ),
    targetWeight: optionalFloat,
    tempo: optionalString,
    cue1: optionalString,
    cue2: optionalString,
    cue3: optionalString,
    restAfterSeconds: optionalInt,
  })
  .superRefine((exercise, ctx) => {
    if (exercise.prescriptionMode === "reps" && exercise.targetReps === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Reps are required for rep-based prescriptions",
        path: ["targetReps"],
      })
    }

    if (
      exercise.prescriptionMode === "time" &&
      exercise.targetDurationSeconds === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Duration is required for time-based prescriptions",
        path: ["targetDurationSeconds"],
      })
    }
  })

export const builderBlockSchema = z
  .object({
    blockType: z.enum(workoutBlockTypeValues),
    orderIndex: z.number().int().min(0),
    name: optionalString,
    rounds: optionalInt,
    restBetweenRoundsSeconds: optionalInt,
    workDurationSeconds: optionalInt,
    restDurationSeconds: optionalInt,
    targetDurationSeconds: optionalInt,
    targetIntensity: optionalString,
    notes: optionalString,
    exercises: z.array(builderBlockExerciseSchema).default([]),
  })
  .superRefine((block, ctx) => {
    if (block.blockType === "circuit" && block.rounds === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Circuits require at least one round",
        path: ["rounds"],
      })
    }

    if (block.blockType === "interval") {
      if (block.workDurationSeconds === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "HIIT intervals require a work duration",
          path: ["workDurationSeconds"],
        })
      }

      if (block.restDurationSeconds === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "HIIT intervals require a rest duration",
          path: ["restDurationSeconds"],
        })
      }
    }

    if (block.blockType === "segment" && block.targetDurationSeconds === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Cardio segments require a target duration",
        path: ["targetDurationSeconds"],
      })
    }
  })

export const workoutBuilderSchema = z.object({
  title: z.string().trim().min(1, "Workout title is required").max(120),
  style: z.enum(workoutStyleValues),
  notes: optionalString,
  blocks: z.array(builderBlockSchema).min(1, "Add at least one block"),
})

export type WorkoutBuilderPayload = z.infer<typeof workoutBuilderSchema>
export type BuilderBlockPayload = z.infer<typeof builderBlockSchema>
export type BuilderBlockExercisePayload = z.infer<typeof builderBlockExerciseSchema>

export type WorkoutBuilderFieldErrors = {
  formError?: string
  title?: string
  style?: string
  notes?: string
  blocks?: string
}

export function parseWorkoutBuilderPayload(
  raw: string
): z.ZodSafeParseResult<WorkoutBuilderPayload> {
  try {
    const json = JSON.parse(raw) as unknown
    return workoutBuilderSchema.safeParse(json)
  } catch {
    return workoutBuilderSchema.safeParse(null)
  }
}

export function getWorkoutBuilderFieldErrors(
  error: z.ZodError<WorkoutBuilderPayload>
): WorkoutBuilderFieldErrors {
  const fieldErrors = error.flatten().fieldErrors

  return {
    formError: error.issues.find((issue) => issue.path.length === 0)?.message,
    title: fieldErrors.title?.[0],
    style: fieldErrors.style?.[0],
    notes: fieldErrors.notes?.[0],
    blocks: fieldErrors.blocks?.[0],
  }
}
