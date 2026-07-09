import {
  ArrowLeftIcon,
  CalendarBlankIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ChartLineUpIcon,
  ClockCounterClockwiseIcon,
} from "@phosphor-icons/react"
import { useState } from "react"
import { Link, useLoaderData } from "react-router"

import type { Route } from "./+types/coach.client.$clientId"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { requireApprovedCoach } from "~/lib/auth.server"
import { workoutStyleLabels } from "~/lib/workout-builder"
import { workoutStatusLabels } from "~/lib/workout-log-form"
import { cn } from "~/lib/utils"
import { getCoachClientById } from "../../../models/client.server"
import {
  getPreviousCompletedLogForClient,
  getUpcomingWorkoutForClient,
} from "../../../models/workout.server"

const placeholderTrends = [
  {
    id: "bench-press",
    title: "Barbell Bench Press",
    description: "Max strength progression",
    metric: "Est. 1RM",
    value: "— lbs",
  },
  {
    id: "squat",
    title: "Back Squat",
    description: "Volume over time",
    metric: "Weekly volume",
    value: "— lbs",
  },
  {
    id: "rpe",
    title: "Session RPE",
    description: "Average perceived exertion",
    metric: "Avg RPE",
    value: "—",
  },
] as const

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireApprovedCoach(request)
  const client = await getCoachClientById(user.id, params.clientId)

  if (!client) {
    throw new Response("Client not found", { status: 404 })
  }

  const [upcomingWorkout, previousWorkout] = await Promise.all([
    getUpcomingWorkoutForClient(user.id, params.clientId),
    getPreviousCompletedLogForClient(user.id, params.clientId),
  ])

  return {
    client,
    upcomingWorkout,
    previousWorkout,
  }
}

export default function CoachClientDashboard() {
  const { client, upcomingWorkout, previousWorkout } = useLoaderData<typeof loader>()
  const [trendIndex, setTrendIndex] = useState(0)
  const activeTrend = placeholderTrends[trendIndex]

  function showPreviousTrend() {
    setTrendIndex((current) =>
      current === 0 ? placeholderTrends.length - 1 : current - 1
    )
  }

  function showNextTrend() {
    setTrendIndex((current) =>
      current === placeholderTrends.length - 1 ? 0 : current + 1
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-4" asChild>
          <Link to="/dashboard/coach/clients">
            <ArrowLeftIcon />
            Back to clients
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{client.name}</h1>
            <p className="mt-2 text-muted-foreground">{client.email}</p>
          </div>
          <Badge variant="secondary">
            Joined {new Date(client.joinedAt).toLocaleDateString()}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CalendarBlankIcon className="size-5 text-primary" />
            <CardTitle className="text-lg">Upcoming workout</CardTitle>
            <CardDescription>
              Next scheduled session for this client.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingWorkout ? (
              <Link
                to={`/dashboard/coach/client/${client.id}/workout/${upcomingWorkout.id}/log`}
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
                  {upcomingWorkout.status === "in_progress"
                    ? "Continue workout log"
                    : "Preview workout"}
                </p>
              </Link>
            ) : (
              <div className="rounded-md border border-dashed p-6 text-center">
                <p className="text-sm font-medium">No upcoming workout</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Workout scheduling will appear here once assigned.
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
              Most recently completed session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {previousWorkout ? (
              <div className="space-y-3">
                <Link
                  to={`/dashboard/coach/client/${client.id}/workout-log/${previousWorkout.logId}`}
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
                  <p className="mt-3 text-xs font-medium text-primary">Review workout</p>
                </Link>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/dashboard/coach/client/${client.id}/workouts/history`}>
                    View all
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-6 text-center">
                <p className="text-sm font-medium">No previous workout</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Logged workouts will appear here after sessions are recorded.
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
              {placeholderTrends.map((trend) => (
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

                    <div
                      className={cn(
                        "mt-6 flex h-40 items-center justify-center rounded-md border border-dashed",
                        "bg-background/60 text-sm text-muted-foreground"
                      )}
                    >
                      Chart placeholder
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex justify-center gap-2">
            {placeholderTrends.map((trend, index) => (
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
            Viewing {activeTrend.title} · trend data will be wired up later
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
