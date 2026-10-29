import { ArrowLeftIcon, ClockCounterClockwiseIcon } from "@phosphor-icons/react"
import { Link, redirect, useActionData, useLoaderData, useNavigation } from "react-router"

import type { Route } from "./+types/coach.client.$clientId.workouts.backfill"
import { WorkoutBuilder } from "~/components/workout-builder"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import {
  getWorkoutBuilderFieldErrors,
  parseWorkoutBuilderPayload,
  type WorkoutBuilderFieldErrors,
} from "~/lib/workout-builder"
import { requireApprovedCoach } from "~/lib/auth.server"
import { getCoachClientById } from "../../../models/client.server"
import { getCoachExercises } from "../../../models/exercise.server"
import { createBackfillWorkoutForClient } from "../../../models/workout.server"

type ActionData = {
  fieldErrors?: WorkoutBuilderFieldErrors
  workoutDateError?: string
} | null

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireApprovedCoach(request)
  const client = await getCoachClientById(user.id, params.clientId)

  if (!client) {
    throw new Response("Client not found", { status: 404 })
  }

  const exercises = await getCoachExercises(user.id)

  return { client, exercises }
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireApprovedCoach(request)
  const client = await getCoachClientById(user.id, params.clientId)

  if (!client) {
    throw new Response("Client not found", { status: 404 })
  }

  const formData = await request.formData()
  const payloadRaw = formData.get("payload")?.toString() ?? ""
  const parsed = parseWorkoutBuilderPayload(payloadRaw)

  if (!parsed.success) {
    return {
      fieldErrors: getWorkoutBuilderFieldErrors(parsed.error),
    } satisfies ActionData
  }

  const workoutDateRaw = formData.get("workoutDate")?.toString()
  if (!workoutDateRaw) {
    return { workoutDateError: "Completed date is required." } satisfies ActionData
  }

  const workoutDate = new Date(`${workoutDateRaw}T12:00:00`)
  if (Number.isNaN(workoutDate.getTime())) {
    return { workoutDateError: "Enter a valid completed date." } satisfies ActionData
  }

  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)
  if (workoutDate.getTime() > endOfToday.getTime()) {
    return {
      workoutDateError: "Completed date cannot be in the future.",
    } satisfies ActionData
  }

  const result = await createBackfillWorkoutForClient(
    user.id,
    params.clientId,
    parsed.data,
    workoutDate
  )

  if (!result.ok) {
    return {
      fieldErrors: { formError: "Unable to create this past workout." },
    } satisfies ActionData
  }

  throw redirect(
    `/dashboard/coach/client/${params.clientId}/workout/${result.workoutId}/log?backfill=1`
  )
}

export default function CoachClientWorkoutBackfill() {
  const { client, exercises } = useLoaderData<typeof loader>()
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

        <h1 className="text-3xl font-semibold tracking-tight">Log past workout</h1>
        <p className="mt-2 text-muted-foreground">
          Build the session structure for a workout that was completed outside Fitizen,
          then enter the actuals on the next step.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClockCounterClockwiseIcon className="size-5 text-primary" />
            Past session builder
          </CardTitle>
          <CardDescription>
            Select a completed date, style, and exercises. You will log performance next.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {exercises.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center">
              <p className="text-sm font-medium">No exercises available</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create exercises first before logging a past workout.
              </p>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link to="/dashboard/exercises/new">Create exercise</Link>
              </Button>
            </div>
          ) : (
            <WorkoutBuilder
              exercises={exercises}
              fieldErrors={actionData?.fieldErrors}
              submitLabel="Continue to log actuals"
              isSubmitting={isSubmitting}
              workoutDateField={{
                label: "Completed date",
                required: true,
                description: "The day this session was completed.",
                error: actionData?.workoutDateError,
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
