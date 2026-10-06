import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ExerciseLogVolumePoint } from "../../models/exercise.server";


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type GroupedVolumeLifted = {
  date: Date | string
  exerciseName: string
  totalVolume: number
}

type GroupedVolumeDuration = {
  date: Date | string
  exerciseName: string
  totalDuration: number
}

type GroupedEstimatedOneRepMax = {
  date: Date | string
  exerciseName: string
  estimatedOneRepMax: number
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value)
}

export function calculateVolumeLifted(logEntries: ExerciseLogVolumePoint[]): GroupedVolumeLifted[] {
  const grouped = logEntries.reduce<Record<string, GroupedVolumeLifted>>((acc, item) => {
    const { completedAt, exerciseName, actualReps, actualWeight } = item;

    if (!completedAt) {
      return acc;
    }

    const date = toDate(completedAt)
    const dateKey = date.toISOString();

    if (!acc[dateKey]) {
      acc[dateKey] = { date, exerciseName, totalVolume: 0 };
    }

    acc[dateKey].totalVolume += (actualReps ?? 0) * (actualWeight ?? 0);

    return acc;
  }, {});

  return Object.values(grouped).sort(
    (a, b) => toDate(a.date).getTime() - toDate(b.date).getTime()
  );
}

export function calculateVolumeDuration(logEntries: ExerciseLogVolumePoint[]): GroupedVolumeDuration[] {
  const grouped = logEntries.reduce<Record<string, GroupedVolumeDuration>>((acc, item) => {
    const { completedAt, exerciseName, actualDurationSeconds, actualWeight } = item;

    if (!completedAt) {
      return acc;
    }

    const date = toDate(completedAt)
    const dateKey = date.toISOString();

    if (!acc[dateKey]) {
      acc[dateKey] = { date, exerciseName, totalDuration: 0 };
    }

    acc[dateKey].totalDuration += (actualDurationSeconds ?? 0) * (actualWeight ?? 0);

    return acc;
  }, {});

  return Object.values(grouped).sort(
    (a, b) => toDate(a.date).getTime() - toDate(b.date).getTime()
  );
}

/** Percent of 1RM represented by a given rep count (1–20). */
const ONE_REP_MAX_PERCENT_BY_REPS: Record<number, number> = {
  1: 1,
  2: 0.97,
  3: 0.94,
  4: 0.92,
  5: 0.89,
  6: 0.86,
  7: 0.83,
  8: 0.81,
  9: 0.78,
  10: 0.75,
  11: 0.73,
  12: 0.71,
  13: 0.7,
  14: 0.68,
  15: 0.67,
  16: 0.65,
  17: 0.64,
  18: 0.63,
  19: 0.61,
  20: 0.6,
}

/** Estimate 1RM from load ÷ % of max for that rep count (e.g. 185×10 @ 75% → 185 / 0.75). */
export function estimateOneRepMax(weight: number, reps: number) {
  if (!Number.isInteger(reps) || reps <= 0 || weight <= 0) {
    return null
  }

  const percentOfMax = ONE_REP_MAX_PERCENT_BY_REPS[reps]
  if (percentOfMax == null) {
    return null
  }

  return weight / percentOfMax
}

/**
 * Per completed session: take the heaviest set (max actualWeight), use that set's
 * actualReps with the percent-based 1RM table. Ties break toward higher reps.
 */
export function calculateEstimatedOneRepMax(
  logEntries: ExerciseLogVolumePoint[]
): GroupedEstimatedOneRepMax[] {
  type SessionBest = {
    date: Date
    exerciseName: string
    weight: number
    reps: number
  }

  const bestBySession = logEntries.reduce<Record<string, SessionBest>>((acc, item) => {
    const { completedAt, exerciseName, actualReps, actualWeight } = item

    if (!completedAt || actualReps == null || actualWeight == null) {
      return acc
    }

    if (actualReps <= 0 || actualWeight <= 0) {
      return acc
    }

    const date = toDate(completedAt)
    const dateKey = date.toISOString()
    const current = acc[dateKey]

    if (
      !current ||
      actualWeight > current.weight ||
      (actualWeight === current.weight && actualReps > current.reps)
    ) {
      acc[dateKey] = {
        date,
        exerciseName,
        weight: actualWeight,
        reps: actualReps,
      }
    }

    return acc
  }, {})

  const results: GroupedEstimatedOneRepMax[] = []

  for (const session of Object.values(bestBySession)) {
    const estimatedOneRepMax = estimateOneRepMax(session.weight, session.reps)
    if (estimatedOneRepMax == null) {
      continue
    }

    results.push({
      date: session.date,
      exerciseName: session.exerciseName,
      estimatedOneRepMax,
    })
  }

  return results.sort(
    (a, b) => toDate(a.date).getTime() - toDate(b.date).getTime()
  )
}

/** Attach % change vs the previous point (`null` for the first point). */
export function withChangePercent<T extends Record<string, string | number>>(
  points: T[],
  valueKey: keyof T & string
): Array<T & { changePercent: number | null }> {
  return points.map((point, index) => {
    if (index === 0) {
      return { ...point, changePercent: null }
    }

    const previous = Number(points[index - 1][valueKey])
    const current = Number(point[valueKey])

    if (!Number.isFinite(previous) || previous === 0 || !Number.isFinite(current)) {
      return { ...point, changePercent: null }
    }

    return {
      ...point,
      changePercent: ((current - previous) / previous) * 100,
    }
  })
}
