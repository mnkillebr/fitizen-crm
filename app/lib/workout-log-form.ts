import { z } from "zod"

export const LOG_FIELD_MAX = 999

export function clampLogInt(
  value: number,
  min = 0,
  max = LOG_FIELD_MAX
): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

export function clampLogRpe(value: number): number {
  return clampLogInt(value, 1, 10)
}

export function snapWeight(value: number): number {
  const snapped = Math.round(value * 2) / 2
  return Math.min(LOG_FIELD_MAX, Math.max(0, snapped))
}

export function parseLogIntInput(
  raw: string,
  options?: { min?: number; max?: number }
): number | undefined {
  const digits = raw.replace(/\D/g, "").slice(0, 3)
  if (!digits) {
    return undefined
  }

  return clampLogInt(Number(digits), options?.min ?? 0, options?.max ?? LOG_FIELD_MAX)
}

export function parseWeightInput(raw: string): number | undefined {
  const cleaned = raw.replace(/[^\d.]/g, "")
  if (!cleaned) {
    return undefined
  }

  const [whole = "", ...rest] = cleaned.split(".")
  const fraction = rest.join("").slice(0, 1)
  const normalized = fraction ? `${whole.slice(0, 3)}.${fraction}` : whole.slice(0, 3)
  const value = Number(normalized)

  if (Number.isNaN(value)) {
    return undefined
  }

  return snapWeight(value)
}

export function formatWeight(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

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
