import { ArrowLeftIcon, ClockCounterClockwiseIcon } from "@phosphor-icons/react"
import { Link, redirect, useActionData, useLoaderData, useNavigation } from "react-router"

import type { Route } from "./+types/coach.client.$clientId.workout-log.$logId"
import { WorkoutLogForm } from "~/components/workout-log-form"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { parseWorkoutLogPayload, workoutLogStatusLabels } from "~/lib/workout-log-form"
import { workoutStyleLabels } from "~/lib/workout-builder"
import { requireApprovedCoach } from "~/lib/auth.server"
import { getCoachClientById } from "../../../models/client.server"
import {
  getCoachWorkoutForClient,
  getCoachWorkoutLog,
  getWorkoutLogWithEntries,
  updateCompletedWorkoutLog,
} from "../../../models/workout.server"

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireApprovedCoach(request)
  const client = await getCoachClientById(user.id, params.clientId)

  if (!client) {
    throw new Response("Client not found", { status: 404 })
  }

  const log = await getCoachWorkoutLog(user.id, params.clientId, params.logId)

  if (!log) {
    throw new Response("Workout log not found", { status: 404 })
  }

  if (log.status !== "completed") {
    if (log.workoutId) {
      throw redirect(
        `/dashboard/coach/client/${params.clientId}/workout/${log.workoutId}/log`
      )
    }

    throw new Response("Workout log not found", { status: 404 })
  }

  const logWithEntries = await getWorkoutLogWithEntries(params.logId)
  if (!logWithEntries) {
    throw new Response("Workout log not found", { status: 404 })
  }

  const workout = log.workoutId
    ? await getCoachWorkoutForClient(user.id, params.clientId, log.workoutId)
    : null

  if (!workout) {
    throw new Response("Workout not found", { status: 404 })
  }

  return { client, workout, log: logWithEntries }
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireApprovedCoach(request)
  const client = await getCoachClientById(user.id, params.clientId)

  if (!client) {
    throw new Response("Client not found", { status: 404 })
  }

  const formData = await request.formData()
  const intent = formData.get("intent")

  if (intent !== "update") {
    return null
  }

  const payloadRaw = formData.get("payload")?.toString() ?? ""
  const parsed = parseWorkoutLogPayload(payloadRaw)

  if (!parsed.success) {
    return { error: "Invalid workout log data." }
  }

  const result = await updateCompletedWorkoutLog(
    user.id,
    params.clientId,
    params.logId,
    parsed.data.entries,
    parsed.data.notes
  )

  if (!result) {
    return { error: "Unable to update this workout log." }
  }

  throw redirect(`/dashboard/coach/client/${params.clientId}/workout-log/${params.logId}`)
}

export default function CoachClientWorkoutLogReview() {
  const { client, workout, log } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === "submitting"

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
              {workout.title ?? "Workout review"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Review and edit a completed session log.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{workoutStyleLabels[workout.style]}</Badge>
            <Badge variant="secondary">{workoutLogStatusLabels[log.status]}</Badge>
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
            <ClockCounterClockwiseIcon className="size-5 text-primary" />
            Completed session
          </CardTitle>
          <CardDescription>
            Completed {log.completedAt ? new Date(log.completedAt).toLocaleString() : "—"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkoutLogForm
            workout={workout}
            defaultEntries={log.entries}
            defaultNotes={log.notes}
            mode="edit"
            submitLabel="Save changes"
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  )
}
