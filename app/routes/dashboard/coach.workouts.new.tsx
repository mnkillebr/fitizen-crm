import { ArrowLeftIcon, CalendarBlankIcon } from "@phosphor-icons/react"
import { Link, redirect, useActionData, useLoaderData, useNavigation } from "react-router"

import type { Route } from "./+types/coach.workouts.new"
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
} from "~/lib/workout-builder"
import { requireApprovedCoach } from "~/lib/auth.server"
import { getCoachExercises } from "../../../models/exercise.server"
import { createWorkoutTemplate } from "../../../models/workout-template.server"

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireApprovedCoach(request)
  const exercises = await getCoachExercises(user.id)

  return { exercises }
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireApprovedCoach(request)
  const formData = await request.formData()
  const payloadRaw = formData.get("payload")?.toString() ?? ""
  const parsed = parseWorkoutBuilderPayload(payloadRaw)

  if (!parsed.success) {
    return {
      fieldErrors: getWorkoutBuilderFieldErrors(parsed.error),
    }
  }

  await createWorkoutTemplate(user.id, parsed.data)

  throw redirect("/dashboard/workouts")
}

export default function CoachCreateWorkout() {
  const { exercises } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === "submitting"

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-4" asChild>
          <Link to="/dashboard/workouts">
            <ArrowLeftIcon />
            Back to workouts
          </Link>
        </Button>

        <h1 className="text-3xl font-semibold tracking-tight">Create workout</h1>
        <p className="mt-2 text-muted-foreground">
          Build a reusable workout template with blocks, exercises, and prescriptions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarBlankIcon className="size-5 text-primary" />
            Workout builder
          </CardTitle>
          <CardDescription>
            Select a style, add blocks, and populate exercises from your catalog.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {exercises.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center">
              <p className="text-sm font-medium">No exercises available</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create exercises first before building workouts.
              </p>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link to="/dashboard/exercises/new">Create exercise</Link>
              </Button>
            </div>
          ) : (
            <WorkoutBuilder
              exercises={exercises}
              fieldErrors={actionData?.fieldErrors}
              submitLabel="Create workout"
              isSubmitting={isSubmitting}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
