import {
  ArrowLeftIcon,
  CalendarBlankIcon,
  PersonSimpleRunIcon,
  ClockCounterClockwiseIcon,
  PlusIcon,
} from "@phosphor-icons/react"
import {
  Link,
  redirect,
  useActionData,
  useLoaderData,
} from "react-router"

import type { Route } from "./+types/coach.client.$clientId"
import { InBodyScanHistory } from "~/components/inbody-scan-history"
import { InBodyTrends } from "~/components/inbody-trends"
import { StrengthTrends } from "~/components/strength-trends"
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
  buildStrengthTrendSlides,
  getUniqueExerciseIds,
  parseTrendIndex,
  resolveTrendSelections,
} from "~/lib/strength-trends"
import { workoutStyleLabels } from "~/lib/workout-builder"
import { workoutStatusLabels } from "~/lib/workout-log-form"
import { getCoachClientById } from "../../../models/client.server"
import {
  getExerciseLogEntries,
  getLoggedExercisesForMember,
  type ExerciseLogVolumePoint,
} from "../../../models/exercise.server"
import {
  deleteCoachInBodyScan,
  getCoachInBodyScansForMember,
} from "../../../models/inbody.server"
import {
  getPreviousCompletedLogForClient,
  getUpcomingWorkoutForClient,
} from "../../../models/workout.server"

type ActionData =
  | {
      formError?: string
    }
  | null

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireApprovedCoach(request)
  const client = await getCoachClientById(user.id, params.clientId)

  if (!client) {
    throw new Response("Client not found", { status: 404 })
  }

  const searchParams = new URL(request.url).searchParams

  const [upcomingWorkout, previousWorkout, loggedExercises, inBodyScans] =
    await Promise.all([
      getUpcomingWorkoutForClient(user.id, params.clientId),
      getPreviousCompletedLogForClient(user.id, params.clientId),
      getLoggedExercisesForMember(params.clientId),
      getCoachInBodyScansForMember(user.id, params.clientId, "desc"),
    ])

  if (!inBodyScans) {
    throw new Response("Client not found", { status: 404 })
  }

  const trendSelections = resolveTrendSelections(searchParams, loggedExercises)
  const uniqueExerciseIds = getUniqueExerciseIds(trendSelections)
  const logEntries = await Promise.all(
    uniqueExerciseIds.map((exerciseId) =>
      getExerciseLogEntries(params.clientId, exerciseId)
    )
  )
  const logsByExerciseId = Object.fromEntries(
    uniqueExerciseIds.map((exerciseId, index) => [
      exerciseId,
      logEntries[index] as ExerciseLogVolumePoint[],
    ])
  )
  const trendSlides = buildStrengthTrendSlides(
    trendSelections,
    loggedExercises,
    logsByExerciseId
  )
  const trendIndex = parseTrendIndex(searchParams.get("t"))

  return {
    client,
    upcomingWorkout,
    previousWorkout,
    loggedExercises,
    trendSlides,
    trendIndex,
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

  return null
}

export default function CoachClientDashboard() {
  const {
    client,
    upcomingWorkout,
    previousWorkout,
    loggedExercises,
    trendSlides,
    trendIndex,
    inBodyScans,
  } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

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

      <StrengthTrends
        exercises={loggedExercises}
        slides={trendSlides}
        trendIndex={trendIndex}
        description={`Track strength and volume over time for ${client.name}.`}
      />

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
        <Button asChild>
          <Link to={`/dashboard/coach/client/${client.id}/inbody/new`}>
            <PlusIcon />
            Log scan
          </Link>
        </Button>
      </div>

      <InBodyTrends
        scans={inBodyScans}
        description={`Body composition trends for ${client.name}.`}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <PersonSimpleRunIcon className="size-5 text-primary" />
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
            getEditPath={(scanId) =>
              `/dashboard/coach/client/${client.id}/inbody/${scanId}/edit`
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}
