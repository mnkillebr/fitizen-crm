import { z } from "zod"

const optionalInt = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
  z.number().int().optional()
)

const optionalFloat = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
  z.number().optional()
)

export const workoutLogEntrySchema = z.object({
  blockExerciseId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  roundNumber: z.number().int().min(1).default(1),
  setNumber: optionalInt,
  actualReps: optionalInt,
  actualDurationSeconds: optionalInt,
  actualRpe: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
    z.number().int().min(1).max(10).optional()
  ),
  actualWeight: optionalFloat,
  notes: z.string().trim().optional(),
})

export const workoutLogPayloadSchema = z.object({
  entries: z.array(workoutLogEntrySchema).default([]),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
})

export type WorkoutLogEntryPayload = z.infer<typeof workoutLogEntrySchema>
export type WorkoutLogPayload = z.infer<typeof workoutLogPayloadSchema>

export function parseWorkoutLogPayload(raw: string): z.ZodSafeParseResult<WorkoutLogPayload> {
  try {
    const json = JSON.parse(raw) as unknown
    return workoutLogPayloadSchema.safeParse(json)
  } catch {
    return workoutLogPayloadSchema.safeParse(null)
  }
}

export const workoutStatusLabels = {
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  no_show: "No show",
} as const

export const workoutLogStatusLabels = {
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
} as const
