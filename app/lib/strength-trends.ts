import {
  calculateEstimatedOneRepMax,
  calculateVolumeDuration,
  calculateVolumeLifted,
  withChangePercent,
} from "~/lib/utils"
import type {
  ExerciseLogVolumePoint,
  LoggedExerciseOption,
} from "../../models/exercise.server"

export const TREND_CARD_COUNT = 3

export const STRENGTH_METRICS = ["volume", "duration", "e1rm"] as const

export type StrengthMetric = (typeof STRENGTH_METRICS)[number]

export const DEFAULT_STRENGTH_METRICS: StrengthMetric[] = [
  "volume",
  "e1rm",
  "duration",
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

const metricDefs: Record<
  StrengthMetric,
  {
    description: string
    metricLabel: string
    seriesKey: string
    chartLabel: string
    emptyMessage: string
    emptyValue: string
    format: (value: number) => string
  }
> = {
  volume: {
    description: "Volume over time",
    metricLabel: "Latest volume",
    seriesKey: "volume",
    chartLabel: "Volume (lbs)",
    emptyMessage: "No volume logged yet",
    emptyValue: "— lbs",
    format: (value) => `${Math.round(value).toLocaleString()} lbs`,
  },
  duration: {
    description: "Volume × duration over time",
    metricLabel: "Latest volume×duration",
    seriesKey: "duration",
    chartLabel: "Volume×duration (lbs·s)",
    emptyMessage: "No duration volume logged yet",
    emptyValue: "—",
    format: (value) => `${Math.round(value).toLocaleString()} lbs·s`,
  },
  e1rm: {
    description: "Estimated maximal strength over time",
    metricLabel: "Est. 1RM",
    seriesKey: "e1rm",
    chartLabel: "Est. 1RM (lbs)",
    emptyMessage: "No estimated 1RM data yet",
    emptyValue: "— lbs",
    format: (value) =>
      `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} lbs`,
  },
}

export function isStrengthMetric(value: string | null): value is StrengthMetric {
  return (
    value === "volume" || value === "duration" || value === "e1rm"
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
      rawPoints = calculateVolumeLifted(logEntries).map((point) => ({
        date: point.date,
        value: point.totalVolume,
      }))
    } else if (selection.metric === "duration") {
      rawPoints = calculateVolumeDuration(logEntries).map((point) => ({
        date: point.date,
        value: point.totalDuration,
      }))
    } else {
      rawPoints = calculateEstimatedOneRepMax(logEntries).map((point) => ({
        date: point.date,
        value: point.estimatedOneRepMax,
      }))
    }

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

export const strengthMetricOptions: Array<{
  value: StrengthMetric
  label: string
}> = [
  { value: "volume", label: "Volume lifted" },
  { value: "duration", label: "Volume × duration" },
  { value: "e1rm", label: "Est. 1RM" },
]
