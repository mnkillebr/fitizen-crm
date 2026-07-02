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
import { cn } from "~/lib/utils"
import { getCoachClientById } from "../../../models/client.server"

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

  return {
    client,
    upcomingWorkout: null,
    previousWorkout: null,
  }
}

export default function CoachClientDashboard() {
  const { client } = useLoaderData<typeof loader>()
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
            <div className="rounded-md border border-dashed p-6 text-center">
              <p className="text-sm font-medium">No upcoming workout</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Workout scheduling will appear here once assigned.
              </p>
            </div>
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
            <div className="rounded-md border border-dashed p-6 text-center">
              <p className="text-sm font-medium">No previous workout</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Logged workouts will appear here after sessions are recorded.
              </p>
            </div>
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
