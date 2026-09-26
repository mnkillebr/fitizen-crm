import { CaretLeftIcon, CaretRightIcon, ChartLineUpIcon } from "@phosphor-icons/react"
import { lazy, Suspense, useState } from "react"

import type { ChartConfig, TrendChartSeries } from "~/components/trend-chart"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { cn } from "~/lib/utils"
import type { InBodyScanSelect } from "../../models/inbody.server"

const TrendChart = lazy(() =>
  import("~/components/trend-chart").then((mod) => ({ default: mod.TrendChart }))
)

type MetricKey =
  | "weightLbs"
  | "skeletalMuscleMassLbs"
  | "percentBodyFat"
  | "ecwRatio"
  | "basalMetabolicRate"

type TrendSlide = {
  id: MetricKey
  title: string
  description: string
  metric: string
  value: string
  chart: {
    config: ChartConfig
    data: Array<Record<string, string | number>>
    xAxisKey: string
    series: TrendChartSeries[]
    emptyMessage?: string
  }
}

function formatChartDate(value: Date | string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

function formatLbs(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} lbs`
}

function formatPercent(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`
}

function formatRatio(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })
}

function formatKcal(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} kcal`
}

const metricDefs: Array<{
  id: MetricKey
  title: string
  description: string
  metric: string
  label: string
  format: (value: number) => string
  emptyFallback: string
}> = [
  {
    id: "weightLbs",
    title: "Weight",
    description: "Total body weight over time",
    metric: "Latest weight",
    label: "Weight (lbs)",
    format: formatLbs,
    emptyFallback: "— lbs",
  },
  {
    id: "skeletalMuscleMassLbs",
    title: "Skeletal muscle mass",
    description: "Lean muscle trend",
    metric: "Latest SMM",
    label: "SMM (lbs)",
    format: formatLbs,
    emptyFallback: "— lbs",
  },
  {
    id: "percentBodyFat",
    title: "Percent body fat",
    description: "Body fat percentage over time",
    metric: "Latest PBF",
    label: "Body fat (%)",
    format: formatPercent,
    emptyFallback: "—%",
  },
  {
    id: "ecwRatio",
    title: "ECW ratio",
    description: "Extracellular water ratio",
    metric: "Latest ECW",
    label: "ECW ratio",
    format: formatRatio,
    emptyFallback: "—",
  },
  {
    id: "basalMetabolicRate",
    title: "Basal metabolic rate",
    description: "Resting calorie burn",
    metric: "Latest BMR",
    label: "BMR (kcal)",
    format: formatKcal,
    emptyFallback: "— kcal",
  },
]

type InBodyTrendsProps = {
  scans: InBodyScanSelect[]
  description?: string
}

export function InBodyTrends({
  scans,
  description = "Track body composition metrics from InBody scans.",
}: InBodyTrendsProps) {
  const [trendIndex, setTrendIndex] = useState(0)

  const chartScans = [...scans].sort(
    (a, b) => new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime()
  )

  const trends: TrendSlide[] = metricDefs.map((def) => {
    const data = chartScans.map((scan) => ({
      date: formatChartDate(scan.scannedAt),
      [def.id]: scan[def.id],
    }))
    const latest = chartScans.at(-1)?.[def.id]

    return {
      id: def.id,
      title: def.title,
      description: def.description,
      metric: def.metric,
      value: latest != null ? def.format(latest) : def.emptyFallback,
      chart: {
        config: {
          [def.id]: {
            label: def.label,
            color: "var(--chart-1)",
          },
        },
        data,
        xAxisKey: "date",
        series: [{ dataKey: def.id, type: "natural", showDots: true }],
        emptyMessage: "No InBody scans logged yet",
      },
    }
  })

  const activeTrend = trends[trendIndex]

  function showPreviousTrend() {
    setTrendIndex((current) => (current === 0 ? trends.length - 1 : current - 1))
  }

  function showNextTrend() {
    setTrendIndex((current) =>
      current === trends.length - 1 ? 0 : current + 1
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <ChartLineUpIcon className="size-5 text-primary" />
            <CardTitle className="mt-2 text-lg">InBody trends</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Previous InBody trend"
              onClick={showPreviousTrend}
            >
              <CaretLeftIcon />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Next InBody trend"
              onClick={showNextTrend}
            >
              <CaretRightIcon />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${trendIndex * 100}%)` }}
          >
            {trends.map((trend) => (
              <div key={trend.id} className="w-full shrink-0 px-1">
                <div className="rounded-lg border bg-muted/20 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{trend.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {trend.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{trend.metric}</p>
                      <p className="text-lg font-semibold">{trend.value}</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Suspense
                      fallback={
                        <div className="flex h-40 items-center justify-center rounded-md border border-dashed bg-background/60 text-sm text-muted-foreground">
                          Loading chart…
                        </div>
                      }
                    >
                      <TrendChart
                        config={trend.chart.config}
                        data={trend.chart.data}
                        xAxisKey={trend.chart.xAxisKey}
                        series={trend.chart.series}
                        emptyMessage={trend.chart.emptyMessage}
                      />
                    </Suspense>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-center gap-2">
          {trends.map((trend, index) => (
            <button
              key={trend.id}
              type="button"
              aria-label={`View ${trend.title} trend`}
              aria-current={index === trendIndex ? "true" : undefined}
              className={cn(
                "size-2 rounded-full transition-colors",
                index === trendIndex
                  ? "bg-primary"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              onClick={() => setTrendIndex(index)}
            />
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Viewing {activeTrend.title}
        </p>
      </CardContent>
    </Card>
  )
}
