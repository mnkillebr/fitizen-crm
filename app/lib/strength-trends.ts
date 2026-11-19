import {
  calculateEstimatedOneRepMax,
  calculateVolumeDuration,
  calculateVolumeLifted,
  calculateWorkVolume,
  withChangePercent,
} from "~/lib/utils"
import type {
  ExerciseLogVolumePoint,
  LoggedExerciseOption,
} from "../../models/exercise.server"

export const TREND_CARD_COUNT = 3

export const STRENGTH_METRICS = ["volume", "duration", "e1rm", "work"] as const

export type StrengthMetric = (typeof STRENGTH_METRICS)[number]

export const DEFAULT_STRENGTH_METRICS: StrengthMetric[] = [
  "volume",
  "e1rm",
  "duration",
  "work",
]

export type StrengthTrendSelection = {
  exerciseId: string
  metric: StrengthMetric
}

/** JSON-safe chart config for loader → client (no ReactNode). */
export type StrengthChartConfig = Record<
  string,
  {
    label: string
    color: string
  }
>

export type StrengthTrendSeries = {
  dataKey: string
  type?: "natural" | "linear" | "step" | "monotone"
  strokeWidth?: number
  showDots?: boolean
}

export type StrengthTrendSlide = {
  index: number
  exerciseId: string
  metric: StrengthMetric
  title: string
  description: string
  metricLabel: string
  value: string
  chart: {
    config: StrengthChartConfig
    data: Array<Record<string, string | number | null>>
    xAxisKey: string
    series: StrengthTrendSeries[]
    emptyMessage: string
  }
}

export type StrengthMetricHelp = {
  value: StrengthMetric
  label: string
  tip: string
  meaning: string
  formula: string
  whyItMatters: string
}

const metricDefs: Record<
  StrengthMetric,
  {
    label: string
    description: string
    metricLabel: string
    seriesKey: string
    chartLabel: string
    emptyMessage: string
    emptyValue: string
    tip: string
    meaning: string
    formula: string
    whyItMatters: string
    format: (value: number) => string
  }
> = {
  volume: {
    label: "Volume lifted",
    description: "Volume load over time",
    metricLabel: "Latest volume lifted",
    seriesKey: "volume",
    chartLabel: "Total Volume Lifted (load x sets x reps)",
    emptyMessage: "No load volume logged yet",
    emptyValue: "—",
    tip: "Session total of reps × load for rep-based sets.",
    meaning:
      "How much total weight you moved in a session for an exercise logged with a rep target.",
    formula:
      "Sum of (reps × load) across that session’s sets. Missing or bodyweight load counts as 1.",
    whyItMatters:
      "Shows overall training load over time so you can see whether work is building, holding steady, or dropping.",
    format: (value) => `${Math.round(value).toLocaleString()}`,
  },
  duration: {
    label: "Volume duration",
    description: "Volume duration over time",
    metricLabel: "Latest volume duration",
    seriesKey: "duration",
    chartLabel: "Total Volume Duration (load x sets x duration)",
    emptyMessage: "No duration volume logged yet",
    emptyValue: "—",
    tip: "Session total of seconds × load for timed sets.",
    meaning:
      "How much timed or isometric work you completed in a session for exercises logged with a time target.",
    formula:
      "Sum of (duration in seconds × load) across that session’s sets. Missing or bodyweight load counts as 1.",
    whyItMatters:
      "Tracks work capacity on holds, carries, and other timed efforts that reps alone cannot capture.",
    format: (value) => `${Math.round(value).toLocaleString()}`,
  },
  work: {
    label: "Work volume",
    description: "Work volume over time",
    metricLabel: "Latest work volume",
    seriesKey: "work",
    chartLabel: "Total Work Volume (load x sets x distance)",
    emptyMessage: "No work volume logged yet",
    emptyValue: "—",
    tip: "Session total of distance × load for distance-based sets.",
    meaning:
      "How much distance-based work you completed in a session for exercises logged with a distance target.",
    formula:
      "Sum of (distance × load) across that session’s sets. Missing or bodyweight load counts as 1.",
    whyItMatters:
      "Useful for sleds, carries, sprints, and other efforts where progress is measured in yards or meters.",
    format: (value) => `${Math.round(value).toLocaleString()}`,
  },
  e1rm: {
    label: "Est. 1RM",
    description: "Estimated maximal strength over time",
    metricLabel: "Est. 1RM",
    seriesKey: "e1rm",
    chartLabel: "Est. 1RM (lbs)",
    emptyMessage: "No estimated 1RM data yet",
    emptyValue: "— lbs",
    tip: "Estimated max from the heaviest set in the session.",
    meaning:
      "An estimate of the heaviest single rep you could lift that day, based on a logged set of multiple reps.",
    formula:
      "Take the heaviest set in the session, then estimate 1RM from that set’s load and reps using a percent-of-max table.",
    whyItMatters:
      "Tracks maximal strength progress without needing a true one-rep max test every session.",
    format: (value) =>
      `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} lbs`,
  },
}

export function getStrengthMetricHelp(
  metric: StrengthMetric
): StrengthMetricHelp {
  const def = metricDefs[metric]
  return {
    value: metric,
    label: def.label,
    tip: def.tip,
    meaning: def.meaning,
    formula: def.formula,
    whyItMatters: def.whyItMatters,
  }
}

export function isStrengthMetric(value: string | null): value is StrengthMetric {
  return (
    value === "volume" || value === "duration" || value === "e1rm" || value === "work"
  )
}

export function parseTrendIndex(value: string | null): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0 || parsed >= TREND_CARD_COUNT) {
    return 0
  }
  return parsed
}

function formatChartDate(value: Date | string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

export function resolveTrendSelections(
  searchParams: URLSearchParams,
  exercises: LoggedExerciseOption[]
): StrengthTrendSelection[] {
  const fallbackExerciseId = exercises[0]?.id ?? ""

  return Array.from({ length: TREND_CARD_COUNT }, (_, index) => {
    const exerciseParam = searchParams.get(`e${index}`)
    const matchingExercise = exercises.find(
      (exercise) => exercise.id === exerciseParam
    )
    const exerciseId =
      matchingExercise?.id ??
      exercises[index]?.id ??
      fallbackExerciseId

    const metricParam = searchParams.get(`m${index}`)
    const metric = isStrengthMetric(metricParam)
      ? metricParam
      : (DEFAULT_STRENGTH_METRICS[index] ?? "volume")

    return { exerciseId, metric }
  })
}

export function buildStrengthTrendSlides(
  selections: StrengthTrendSelection[],
  exercises: LoggedExerciseOption[],
  logsByExerciseId: Record<string, ExerciseLogVolumePoint[]>
): StrengthTrendSlide[] {
  return selections.map((selection, index) => {
    const exerciseName =
      exercises.find((exercise) => exercise.id === selection.exerciseId)?.name ??
      "Exercise"
    const def = metricDefs[selection.metric]
    const logEntries = logsByExerciseId[selection.exerciseId] ?? []
    let rawPoints: Array<{ date: Date | string; value: number }> = []

    if (selection.metric === "volume") {
      const repsEntries = logEntries.filter(
        (entry) => {
          if (entry.prescriptionMode) {
            return entry.prescriptionMode === "reps"
          } else {
            return entry.actualReps !== null && entry.actualDurationSeconds === null && entry.actualDistance === null
          }
        }
      )
      rawPoints = calculateVolumeLifted(repsEntries).map((point) => ({
        date: point.date,
        value: point.totalVolume,
      }))
    } else if (selection.metric === "duration") {
      const timeEntries = logEntries.filter(
        (entry) => {
          if (entry.prescriptionMode) {
            return entry.prescriptionMode === "time"
          } else {
            return entry.actualDurationSeconds !== null && entry.actualReps === null && entry.actualDistance === null
          }
        }
      )
      rawPoints = calculateVolumeDuration(timeEntries).map((point) => ({
        date: point.date,
        value: point.totalDuration,
      }))
    } else if (selection.metric === "work") {
      const distanceEntries = logEntries.filter(
        (entry) => {
          if (entry.prescriptionMode) {
            return entry.prescriptionMode === "distance"
          } else {
            return entry.actualDistance !== null && entry.actualDurationSeconds === null && entry.actualReps === null
          }
        }
      )
      rawPoints = calculateWorkVolume(distanceEntries).map((point) => ({
        date: point.date,
        value: point.totalWorkVolume,
      }))
    } else {
      const repsEntries = logEntries.filter(
          (entry) => {
            if (entry.prescriptionMode) {
              return entry.prescriptionMode === "reps"
            } else {
              return entry.actualReps !== null && entry.actualDurationSeconds === null && entry.actualDistance === null
            }
          }
        )
      rawPoints = calculateEstimatedOneRepMax(repsEntries).map((point) => ({
        date: point.date,
        value: point.estimatedOneRepMax,
      }))
    }

    rawPoints = rawPoints.filter((point) => point.value !== 0)

    const chartRows = withChangePercent(
      rawPoints.map((point) => ({
        date: formatChartDate(point.date),
        [def.seriesKey]:
          selection.metric === "e1rm"
            ? Number(point.value.toFixed(1))
            : Math.round(point.value),
      })),
      def.seriesKey
    )

    const latest = rawPoints.at(-1)?.value

    return {
      index,
      exerciseId: selection.exerciseId,
      metric: selection.metric,
      title: exerciseName,
      description: def.description,
      metricLabel: def.metricLabel,
      value: latest != null ? def.format(latest) : def.emptyValue,
      chart: {
        config: {
          [def.seriesKey]: {
            label: def.chartLabel,
            color: "var(--chart-1)",
          },
        },
        data: chartRows,
        xAxisKey: "date",
        series: [
          {
            dataKey: def.seriesKey,
            type: "natural",
            showDots: true,
          },
        ],
        emptyMessage: def.emptyMessage,
      },
    }
  })
}

export function getUniqueExerciseIds(selections: StrengthTrendSelection[]) {
  return [...new Set(selections.map((selection) => selection.exerciseId).filter(Boolean))]
}

export function createTrendsSearchParams(
  current: URLSearchParams,
  updates: {
    trendIndex?: number
    exercise?: { index: number; id: string }
    metric?: { index: number; value: StrengthMetric }
  }
) {
  const next = new URLSearchParams(current)

  if (updates.trendIndex != null) {
    next.set("t", String(updates.trendIndex))
  }

  if (updates.exercise) {
    next.set(`e${updates.exercise.index}`, updates.exercise.id)
  }

  if (updates.metric) {
    next.set(`m${updates.metric.index}`, updates.metric.value)
  }

  return next
}

export const strengthMetricOptions: StrengthMetricHelp[] = [
  getStrengthMetricHelp("volume"),
  getStrengthMetricHelp("duration"),
  getStrengthMetricHelp("work"),
  getStrengthMetricHelp("e1rm"),
]
