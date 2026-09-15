import {
  ArrowLeftIcon,
  CalendarBlankIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ChartLineUpIcon,
  ClockCounterClockwiseIcon,
} from "@phosphor-icons/react"
import { lazy, Suspense, useState } from "react"
import { Link, useLoaderData } from "react-router"

import type { Route } from "./+types/member.workouts"
import type { ChartConfig, TrendChartSeries } from "~/components/trend-chart"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { requireRole } from "~/lib/auth.server"
import { workoutStyleLabels } from "~/lib/workout-builder"
import { workoutStatusLabels } from "~/lib/workout-log-form"
import { calculateVolumeLifted, cn } from "~/lib/utils"
import { getExerciseLogEntries } from "../../../models/exercise.server"
import {
  getPreviousCompletedLogForMember,
  getUpcomingWorkoutForMember,
} from "../../../models/workout.server"

const TrendChart = lazy(() =>
  import("~/components/trend-chart").then((mod) => ({ default: mod.TrendChart }))
)

type TrendSlide = {
  id: string
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
  } | null
}

function formatChartDate(value: Date | string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

function formatVolume(value: number) {
  return `${value.toLocaleString()} lbs`
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireRole(request, "member")

  const [upcomingWorkout, previousWorkout, lateralLungeLogEntries] =
    await Promise.all([
      getUpcomingWorkoutForMember(user.id),
      getPreviousCompletedLogForMember(user.id),
      getExerciseLogEntries(user.id, "4788fb67-4688-4f95-b0f6-cb4f2f59ff70"),
    ])

  const volumeLifted = calculateVolumeLifted(lateralLungeLogEntries)

  return {
    upcomingWorkout,
    previousWorkout,
    volumeLifted,
  }
}

export default function MemberWorkouts() {
  const { upcomingWorkout, previousWorkout, volumeLifted } =
    useLoaderData<typeof loader>()
  const [trendIndex, setTrendIndex] = useState(0)

  const volumeChartData = volumeLifted.map((point) => ({
    date: formatChartDate(point.date),
    volume: point.totalVolume,
  }))
  const volumeExerciseName = volumeLifted[0]?.exerciseName ?? "Volume"
  const latestVolume = volumeChartData.at(-1)?.volume

  const trends: TrendSlide[] = [
    {
      id: "volume",
      title: volumeExerciseName,
      description: "Volume over time",
      metric: "Latest volume",
      value: latestVolume != null ? formatVolume(latestVolume) : "— lbs",
      chart: {
        config: {
          volume: {
            label: "Volume (lbs)",
            color: "var(--chart-1)",
          },
        },
        data: volumeChartData,
        xAxisKey: "date",
        series: [{ dataKey: "volume", type: "natural", showDots: true }],
        emptyMessage: "No volume logged yet",
      },
    },
    {
      id: "bench-press",
      title: "Barbell Bench Press",
      description: "Max strength progression",
      metric: "Est. 1RM",
      value: "— lbs",
      chart: null,
    },
    {
      id: "rpe",
      title: "Session RPE",
      description: "Average perceived exertion",
      metric: "Avg RPE",
      value: "—",
      chart: null,
    },
  ]

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
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-4" asChild>
          <Link to="/dashboard/member">
            <ArrowLeftIcon />
            Back to dashboard
          </Link>
        </Button>

        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Workouts</h1>
          <p className="mt-2 text-muted-foreground">
            See what&apos;s coming up, review past sessions, and track your trends.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CalendarBlankIcon className="size-5 text-primary" />
            <CardTitle className="text-lg">Upcoming workout</CardTitle>
            <CardDescription>
              Your next scheduled training session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingWorkout ? (
              <Link
                to={`/dashboard/member/workouts/${upcomingWorkout.id}`}
                className="block rounded-md border p-4 transition-colors hover:border-primary/40 hover:bg-muted/20"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {upcomingWorkout.title ?? "Scheduled workout"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(upcomingWorkout.workoutDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {workoutStyleLabels[upcomingWorkout.style]}
                    </Badge>
                    <Badge variant="secondary">
                      {workoutStatusLabels[upcomingWorkout.status]}
                    </Badge>
                  </div>
                </div>
                <p className="mt-3 text-xs font-medium text-primary">
                  View workout
                </p>
              </Link>
            ) : (
              <div className="rounded-md border border-dashed p-6 text-center">
                <p className="text-sm font-medium">No upcoming workout</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Assigned sessions from your coach will appear here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <ClockCounterClockwiseIcon className="size-5 text-primary" />
            <CardTitle className="text-lg">Previous workout</CardTitle>
            <CardDescription>
              Your most recently completed session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {previousWorkout ? (
              <div className="space-y-3">
                <Link
                  to={`/dashboard/member/workout-log/${previousWorkout.logId}`}
                  className="block rounded-md border p-4 transition-colors hover:border-primary/40 hover:bg-muted/20"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {previousWorkout.title ?? "Completed workout"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Completed{" "}
                        {new Date(previousWorkout.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {workoutStyleLabels[previousWorkout.style]}
                    </Badge>
                  </div>
                  <p className="mt-3 text-xs font-medium text-primary">
                    Review & leave feedback
                  </p>
                </Link>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/dashboard/member/workouts/history">View all</Link>
                </Button>
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-6 text-center">
                <p className="text-sm font-medium">No previous workout</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Completed sessions will appear here after your coach logs them.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <ChartLineUpIcon className="size-5 text-primary" />
              <CardTitle className="mt-2 text-lg">Trends</CardTitle>
              <CardDescription>
                Track strength, volume, and exertion over time.
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Previous trend"
                onClick={showPreviousTrend}
              >
                <CaretLeftIcon />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Next trend"
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
                        <p className="text-xs text-muted-foreground">
                          {trend.metric}
                        </p>
                        <p className="text-lg font-semibold">{trend.value}</p>
                      </div>
                    </div>

                    <div className="mt-6">
                      {trend.chart ? (
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
                      ) : (
                        <div
                          className={cn(
                            "flex h-40 items-center justify-center rounded-md border border-dashed",
                            "bg-background/60 text-sm text-muted-foreground"
                          )}
                        >
                          Chart coming soon
                        </div>
                      )}
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
    </div>
  )
}
