import {
  CaretLeftIcon,
  CaretRightIcon,
  PersonSimpleRunIcon,
} from "@phosphor-icons/react"
import { lazy, Suspense } from "react"
import { Link, useSearchParams } from "react-router"

import type { StrengthTrendSlide } from "~/lib/strength-trends"
import {
  createTrendsSearchParams,
  strengthMetricOptions,
  TREND_CARD_COUNT,
} from "~/lib/strength-trends"
import { cn } from "~/lib/utils"
import type { LoggedExerciseOption } from "../../models/exercise.server"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"

const TrendChart = lazy(() =>
  import("~/components/trend-chart").then((mod) => ({ default: mod.TrendChart }))
)

type StrengthTrendsProps = {
  exercises: LoggedExerciseOption[]
  slides: StrengthTrendSlide[]
  trendIndex: number
  description?: string
}

export function StrengthTrends({
  exercises,
  slides,
  trendIndex,
  description = "Track strength and volume over time.",
}: StrengthTrendsProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeSlide = slides[trendIndex] ?? slides[0]
  const previousIndex =
    trendIndex === 0 ? TREND_CARD_COUNT - 1 : trendIndex - 1
  const nextIndex = trendIndex === TREND_CARD_COUNT - 1 ? 0 : trendIndex + 1

  function updateSearchParams(
    updates: Parameters<typeof createTrendsSearchParams>[1]
  ) {
    setSearchParams(createTrendsSearchParams(searchParams, updates), {
      preventScrollReset: true,
      replace: true,
    })
  }

  if (exercises.length === 0 || slides.length === 0) {
    return (
      <Card>
        <CardHeader>
          <PersonSimpleRunIcon className="size-5 text-primary" />
          <CardTitle className="mt-2 text-lg">Trends</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed p-6 text-center">
            <p className="text-sm font-medium">No strength trends yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete workouts with logged sets to unlock exercise trends.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <PersonSimpleRunIcon className="size-5 text-primary" />
            <CardTitle className="mt-2 text-lg">Trends</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" asChild>
              <Link
                to={{
                  search: `?${createTrendsSearchParams(searchParams, {
                    trendIndex: previousIndex,
                  }).toString()}`,
                }}
                preventScrollReset
                replace
                aria-label="Previous trend"
              >
                <CaretLeftIcon />
              </Link>
            </Button>
            <Button variant="outline" size="icon-sm" asChild>
              <Link
                to={{
                  search: `?${createTrendsSearchParams(searchParams, {
                    trendIndex: nextIndex,
                  }).toString()}`,
                }}
                preventScrollReset
                replace
                aria-label="Next trend"
              >
                <CaretRightIcon />
              </Link>
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
            {slides.map((slide) => (
              <div key={slide.index} className="w-full shrink-0 px-1">
                <div className="rounded-lg border bg-muted/20 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Select
                          value={slide.exerciseId}
                          onValueChange={(exerciseId) => {
                            if (!exerciseId) return
                            updateSearchParams({
                              exercise: { index: slide.index, id: exerciseId },
                              trendIndex: slide.index,
                            })
                          }}
                        >
                          <SelectTrigger size="sm" aria-label="Select exercise">
                            <SelectValue placeholder="Exercise" />
                          </SelectTrigger>
                          <SelectContent>
                            {exercises.map((exercise) => (
                              <SelectItem key={exercise.id} value={exercise.id}>
                                {exercise.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={slide.metric}
                          onValueChange={(metric) => {
                            if (
                              metric !== "volume" &&
                              metric !== "duration" &&
                              metric !== "e1rm"
                            ) {
                              return
                            }
                            updateSearchParams({
                              metric: { index: slide.index, value: metric },
                              trendIndex: slide.index,
                            })
                          }}
                        >
                          <SelectTrigger size="sm" aria-label="Select metric">
                            <SelectValue placeholder="Metric" />
                          </SelectTrigger>
                          <SelectContent>
                            {strengthMetricOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{slide.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {slide.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {slide.metricLabel}
                      </p>
                      <p className="text-lg font-semibold">{slide.value}</p>
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
                        config={slide.chart.config}
                        data={slide.chart.data}
                        xAxisKey={slide.chart.xAxisKey}
                        series={slide.chart.series}
                        emptyMessage={slide.chart.emptyMessage}
                        showChangePercent
                      />
                    </Suspense>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-center gap-2">
          {slides.map((slide) => (
            <Link
              key={slide.index}
              to={{
                search: `?${createTrendsSearchParams(searchParams, {
                  trendIndex: slide.index,
                }).toString()}`,
              }}
              preventScrollReset
              replace
              aria-label={`View trend card ${slide.index + 1}`}
              aria-current={slide.index === trendIndex ? "true" : undefined}
              className={cn(
                "size-2 rounded-full transition-colors",
                slide.index === trendIndex
                  ? "bg-primary"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>

        {activeSlide ? (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Viewing {activeSlide.title} ·{" "}
            {strengthMetricOptions.find(
              (option) => option.value === activeSlide.metric
            )?.label ?? activeSlide.metric}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
