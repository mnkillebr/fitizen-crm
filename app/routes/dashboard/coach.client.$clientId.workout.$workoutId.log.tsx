import { ArrowLeftIcon, CalendarBlankIcon, PlayIcon } from "@phosphor-icons/react"
import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from "react-router"

import type { Route } from "./+types/coach.client.$clientId.workout.$workoutId.log"
import { WorkoutLogForm } from "~/components/workout-log-form"
import { WorkoutPreview } from "~/components/workout-preview"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { parseWorkoutLogPayload, workoutStatusLabels } from "~/lib/workout-log-form"
import { workoutStyleLabels } from "~/lib/workout-builder"
import { requireApprovedCoach } from "~/lib/auth.server"
import { getCoachClientById } from "../../../models/client.server"
import { getCoachExercises } from "../../../models/exercise.server"
import { createWorkoutTemplateFromLoggedWorkout } from "../../../models/workout-template.server"
import {
  abandonBackfillWorkout,
  cancelWorkoutLog,
  completeWorkoutLog,
  getActiveLogForWorkout,
  getCoachWorkoutForClient,
  getLastLoggedSetsForExercises,
  getWorkoutLogWithEntries,
  markWorkoutNoShow,
  rescheduleWorkout,
  startWorkoutLog,
} from "../../../models/workout.server"

function isBackfillRequest(request: Request) {
  return new URL(request.url).searchParams.get("backfill") === "1"
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireApprovedCoach(request)
  const client = await getCoachClientById(user.id, params.clientId)
  const backfill = isBackfillRequest(request)

  if (!client) {
    throw new Response("Client not found", { status: 404 })
  }

  const workout = await getCoachWorkoutForClient(
    user.id,
    params.clientId,
    params.workoutId
  )

  if (!workout) {
    throw new Response("Workout not found", { status: 404 })
  }

  if (workout.status === "completed" || workout.status === "no_show") {
    throw redirect(`/dashboard/coach/client/${params.clientId}`)
  }

  const existingActiveLogs = await getActiveLogForWorkout(params.workoutId)
  let log = existingActiveLogs[0] ?? null
  let workoutForPage = workout

  if (backfill && !log) {
    const startedLog = await startWorkoutLog(
      user.id,
      params.clientId,
      params.workoutId,
      user.id
    )

    if (!startedLog) {
      throw new Response("Unable to start backfill log", { status: 400 })
    }

    log = startedLog
    workoutForPage =
      (await getCoachWorkoutForClient(
        user.id,
        params.clientId,
        params.workoutId
      )) ?? workout
  }

  const coachExercises = await getCoachExercises(user.id)
  const swapExercises = coachExercises.map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
  }))

  const plannedExerciseIds = workoutForPage.blocks.flatMap((block) =>
    block.exercises.map((exercise) => exercise.exerciseId)
  )
  const swapExerciseIds = swapExercises.map((exercise) => exercise.id)

  if (!log) {
    const lastLoggedByExerciseId = await getLastLoggedSetsForExercises(
      params.clientId,
      [...plannedExerciseIds, ...swapExerciseIds]
    )

    return {
      client,
      workout: workoutForPage,
      log: null,
      entries: [],
      swapExercises,
      lastLoggedByExerciseId,
      backfill,
    }
  }

  const logWithEntries = await getWorkoutLogWithEntries(log.id)
  const entries = logWithEntries?.entries ?? []
  const exerciseIds = [
    ...new Set([
      ...plannedExerciseIds,
      ...swapExerciseIds,
      ...entries.map((entry) => entry.exerciseId),
    ]),
  ]
  const lastLoggedByExerciseId = await getLastLoggedSetsForExercises(
    params.clientId,
    exerciseIds
  )

  return {
    client,
    workout: workoutForPage,
    log,
    entries,
    swapExercises,
    lastLoggedByExerciseId,
    backfill,
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireApprovedCoach(request)
  const client = await getCoachClientById(user.id, params.clientId)
  const backfill = isBackfillRequest(request)

  if (!client) {
    throw new Response("Client not found", { status: 404 })
  }

  const workout = await getCoachWorkoutForClient(
    user.id,
    params.clientId,
    params.workoutId
  )

  if (!workout) {
    throw new Response("Workout not found", { status: 404 })
  }

  const formData = await request.formData()
  const intent = formData.get("intent")?.toString()
  const dashboardUrl = `/dashboard/coach/client/${params.clientId}`
  const historyUrl = `/dashboard/coach/client/${params.clientId}/workouts/history`
  const logUrl = backfill
    ? `/dashboard/coach/client/${params.clientId}/workout/${params.workoutId}/log?backfill=1`
    : `/dashboard/coach/client/${params.clientId}/workout/${params.workoutId}/log`

  if (intent === "start") {
    if (backfill) {
      throw redirect(logUrl)
    }

    const log = await startWorkoutLog(
      user.id,
      params.clientId,
      params.workoutId,
      user.id
    )

    if (!log) {
      return { error: "Unable to start this workout." }
    }

    throw redirect(logUrl)
  }

  if (intent === "reschedule") {
    if (backfill) {
      return { error: "Reschedule is not available while logging a past workout." }
    }

    const workoutDateRaw = formData.get("workoutDate")?.toString()
    if (!workoutDateRaw) {
      return { error: "Workout date is required." }
    }

    const newDate = new Date(`${workoutDateRaw}T12:00:00`)
    if (Number.isNaN(newDate.getTime())) {
      return { error: "Enter a valid workout date." }
    }

    const result = await rescheduleWorkout(
      user.id,
      params.clientId,
      params.workoutId,
      newDate
    )

    if (!result) {
      return { error: "Unable to reschedule this workout." }
    }

    throw redirect(dashboardUrl)
  }

  if (intent === "no-show") {
    if (backfill) {
      return { error: "No-show is not available while logging a past workout." }
    }

    await markWorkoutNoShow(user.id, params.clientId, params.workoutId, user.id)
    throw redirect(dashboardUrl)
  }

  const activeLogs = await getActiveLogForWorkout(params.workoutId)
  const activeLog = activeLogs[0]

  if (!activeLog) {
    return { error: "Start the workout before completing or cancelling the session." }
  }

  if (intent === "cancel") {
    if (backfill) {
      await abandonBackfillWorkout(user.id, params.clientId, params.workoutId)
      throw redirect(dashboardUrl)
    }

    await cancelWorkoutLog(user.id, activeLog.id)
    throw redirect(logUrl)
  }

  if (intent === "complete") {
    const payloadRaw = formData.get("payload")?.toString() ?? ""
    const parsed = parseWorkoutLogPayload(payloadRaw)

    if (!parsed.success) {
      return { error: "Invalid workout log data." }
    }

    const result = await completeWorkoutLog(
      user.id,
      activeLog.id,
      parsed.data.entries,
      parsed.data.notes,
      backfill ? new Date(workout.workoutDate) : undefined
    )

    if (!result) {
      return { error: "Unable to complete this workout log." }
    }

    const saveAsTemplate = formData.get("saveAsTemplate")?.toString() === "1"
    const hasSwaps = parsed.data.entries.some(
      (entry) => entry.swapReason != null || entry.originalExerciseId != null
    )

    if (saveAsTemplate && hasSwaps) {
      const templateTitle =
        formData.get("templateTitle")?.toString().trim() ||
        `${workout.title ?? "Workout"} (modified)`
      await createWorkoutTemplateFromLoggedWorkout(
        user.id,
        workout,
        parsed.data.entries,
        templateTitle
      )
    }

    throw redirect(backfill ? historyUrl : dashboardUrl)
  }

  return null
}

export default function CoachClientWorkoutLog() {
  const {
    client,
    workout,
    log,
    entries,
    swapExercises,
    lastLoggedByExerciseId,
    backfill,
  } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === "submitting"
  const isPreview = !log && !backfill

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-4" asChild>
          <Link to={`/dashboard/coach/client/${client.id}`}>
            <ArrowLeftIcon />
            Back to {client.name}
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {workout.title ?? "Workout"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {backfill
                ? "Enter actual performance for this past session."
                : isPreview
                  ? "Review the prescription before starting the session."
                  : "Log actual performance for this session."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{workoutStyleLabels[workout.style]}</Badge>
            <Badge variant="secondary">{workoutStatusLabels[workout.status]}</Badge>
            {backfill ? <Badge variant="outline">Past session</Badge> : null}
          </div>
        </div>
      </div>

      {actionData?.error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {actionData.error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarBlankIcon className="size-5 text-primary" />
            {backfill ? "Past session log" : isPreview ? "Workout preview" : "Session log"}
          </CardTitle>
          <CardDescription>
            {backfill ? "Completed" : "Scheduled for"}{" "}
            {new Date(workout.workoutDate).toLocaleDateString()}
            {!backfill && !isPreview && log ? (
              <> · Started {new Date(log.startedAt).toLocaleString()}</>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPreview ? (
            <div className="space-y-6">
              <WorkoutPreview workout={workout} />

              <Form method="post" className="flex flex-wrap gap-2">
                <Button type="submit" name="intent" value="start" disabled={isSubmitting}>
                  <PlayIcon />
                  {isSubmitting ? "Starting..." : "Start workout"}
                </Button>
                <Button
                  type="submit"
                  name="intent"
                  value="no-show"
                  variant="destructive"
                  disabled={isSubmitting}
                  onClick={(event) => {
                    if (
                      !window.confirm("Mark this session as a no-show? This cannot be undone.")
                    ) {
                      event.preventDefault()
                    }
                  }}
                >
                  Mark no-show
                </Button>
              </Form>

              <Form method="post" className="rounded-md border bg-muted/10 p-4">
                <input type="hidden" name="intent" value="reschedule" />
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="reschedule-date">Reschedule to</Label>
                    <Input id="reschedule-date" name="workoutDate" type="date" required />
                  </div>
                  <Button type="submit" variant="outline" disabled={isSubmitting}>
                    Reschedule workout
                  </Button>
                </div>
              </Form>
            </div>
          ) : log ? (
            <WorkoutLogForm
              workout={workout}
              defaultEntries={entries}
              defaultNotes={log.notes}
              isSubmitting={isSubmitting}
              allowExerciseSwap
              swapExercises={swapExercises}
              lastLoggedByExerciseId={lastLoggedByExerciseId}
              backfillMode={backfill}
              submitLabel={backfill ? "Save past workout" : "Complete workout"}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
