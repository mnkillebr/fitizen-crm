import {
  ArrowLeftIcon,
  CalendarBlankIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ChartLineUpIcon,
  ClockCounterClockwiseIcon,
  PlusIcon,
} from "@phosphor-icons/react"
import { lazy, Suspense, useState } from "react"
import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router"

import type { Route } from "./+types/coach.client.$clientId"
import type { ChartConfig, TrendChartSeries } from "~/components/trend-chart"
import { InBodyScanForm } from "~/components/inbody-scan-form"
import { InBodyScanHistory } from "~/components/inbody-scan-history"
import { InBodyTrends } from "~/components/inbody-trends"
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
import {
  getInBodyFormFieldErrors,
  parseInBodyFormData,
  type InBodyFormFieldErrors,
} from "~/lib/inbody-form"
import { workoutStyleLabels } from "~/lib/workout-builder"
import { workoutStatusLabels } from "~/lib/workout-log-form"
import { calculateVolumeLifted, cn } from "~/lib/utils"
import { getCoachClientById } from "../../../models/client.server"
import { getExerciseLogEntries } from "../../../models/exercise.server"
import {
  createCoachInBodyScan,
  deleteCoachInBodyScan,
  getCoachInBodyScansForMember,
  updateCoachInBodyScan,
} from "../../../models/inbody.server"
import {
  getPreviousCompletedLogForClient,
  getUpcomingWorkoutForClient,
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

type ActionData =
  | {
      fieldErrors?: InBodyFormFieldErrors
      formError?: string
      editingScanId?: string | null
    }
  | null

function formatChartDate(value: Date | string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

function formatVolume(value: number) {
  return `${value.toLocaleString()} lbs`
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireApprovedCoach(request)
  const client = await getCoachClientById(user.id, params.clientId)

  if (!client) {
    throw new Response("Client not found", { status: 404 })
  }

  const [upcomingWorkout, previousWorkout, lateralLungeLogEntries, inBodyScans] =
    await Promise.all([
      getUpcomingWorkoutForClient(user.id, params.clientId),
      getPreviousCompletedLogForClient(user.id, params.clientId),
      getExerciseLogEntries(params.clientId, "4788fb67-4688-4f95-b0f6-cb4f2f59ff70"),
      getCoachInBodyScansForMember(user.id, params.clientId, "desc"),
    ])

  if (!inBodyScans) {
    throw new Response("Client not found", { status: 404 })
  }

  const volumeLifted = calculateVolumeLifted(lateralLungeLogEntries)

  return {
    client,
    upcomingWorkout,
    previousWorkout,
    volumeLifted,
    inBodyScans,
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireApprovedCoach(request)
  const client = await getCoachClientById(user.id, params.clientId)

  if (!client) {
    throw new Response("Client not found", { status: 404 })
  }

  const formData = await request.formData()
  const intent = formData.get("intent")?.toString()
  const clientUrl = `/dashboard/coach/client/${params.clientId}`

  if (intent === "edit-scan") {
    const scanId = formData.get("scanId")?.toString()
    if (!scanId) {
      return { formError: "Scan not found." } satisfies ActionData
    }
    return { editingScanId: scanId } satisfies ActionData
  }

  if (intent === "cancel-edit") {
    return { editingScanId: null } satisfies ActionData
  }

  if (intent === "delete-scan") {
    const scanId = formData.get("scanId")?.toString()
    if (!scanId) {
      return { formError: "Scan not found." } satisfies ActionData
    }

    const deleted = await deleteCoachInBodyScan(user.id, params.clientId, scanId)
    if (!deleted) {
      return { formError: "Unable to delete this scan." } satisfies ActionData
    }

    throw redirect(clientUrl)
  }

  if (intent === "create-scan" || intent === "update-scan") {
    const parsed = parseInBodyFormData(formData)
    if (!parsed.success) {
      return {
        fieldErrors: getInBodyFormFieldErrors(parsed.error),
        editingScanId:
          intent === "update-scan"
            ? formData.get("scanId")?.toString() ?? null
            : null,
      } satisfies ActionData
    }

    if (intent === "create-scan") {
      const created = await createCoachInBodyScan(
        user.id,
        params.clientId,
        user.id,
        parsed.data
      )
      if (!created) {
        return { formError: "Unable to save this scan." } satisfies ActionData
      }
      throw redirect(clientUrl)
    }

    const scanId = formData.get("scanId")?.toString()
    if (!scanId) {
      return { formError: "Scan not found." } satisfies ActionData
    }

    const updated = await updateCoachInBodyScan(
      user.id,
      params.clientId,
      scanId,
      parsed.data
    )
    if (!updated) {
      return { formError: "Unable to update this scan." } satisfies ActionData
    }

    throw redirect(clientUrl)
  }

  return null
}

export default function CoachClientDashboard() {
  const { client, upcomingWorkout, previousWorkout, volumeLifted, inBodyScans } =
    useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === "submitting"
  const [trendIndex, setTrendIndex] = useState(0)
  const [showCreateForm, setShowCreateForm] = useState(inBodyScans.length === 0)

  const editingScanId = actionData?.editingScanId ?? null

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

      {actionData?.formError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {actionData.formError}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">InBody</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Log and track body composition scans for {client.name}.
          </p>
        </div>
        {!showCreateForm && !editingScanId ? (
          <Button type="button" onClick={() => setShowCreateForm(true)}>
            <PlusIcon />
            Log scan
          </Button>
        ) : null}
      </div>

      <InBodyTrends
        scans={inBodyScans}
        description={`Body composition trends for ${client.name}.`}
      />

      {showCreateForm && !editingScanId ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PlusIcon className="size-5 text-primary" />
              Log InBody scan
            </CardTitle>
            <CardDescription>
              Enter values from {client.name}&apos;s InBody report.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post">
              <InBodyScanForm
                fieldErrors={
                  !editingScanId ? actionData?.fieldErrors : undefined
                }
                submitLabel="Save scan"
                submitIntent="create-scan"
                isSubmitting={isSubmitting}
                cancelSlot={
                  inBodyScans.length > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSubmitting}
                      onClick={() => setShowCreateForm(false)}
                    >
                      Cancel
                    </Button>
                  ) : null
                }
              />
            </Form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ChartLineUpIcon className="size-5 text-primary" />
                Scan history
              </CardTitle>
              <CardDescription>
                Review, edit, or delete past InBody scans.
              </CardDescription>
            </div>
            <Badge variant="secondary">{inBodyScans.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <InBodyScanHistory
            scans={inBodyScans}
            editingScanId={editingScanId}
            fieldErrors={editingScanId ? actionData?.fieldErrors : undefined}
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  )
}
