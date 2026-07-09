import { ArrowLeftIcon, CalendarBlankIcon } from "@phosphor-icons/react"
import { Link, redirect, useActionData, useLoaderData, useNavigation } from "react-router"

import type { Route } from "./+types/coach.workouts.$templateId.edit"
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
import {
  getTemplateWithDetails,
  updateWorkoutTemplate,
} from "../../../models/workout-template.server"

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireApprovedCoach(request)
  const [exercises, template] = await Promise.all([
    getCoachExercises(user.id),
    getTemplateWithDetails(user.id, params.templateId),
  ])

  if (!template) {
    throw new Response("Workout not found", { status: 404 })
  }

  return { exercises, template }
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireApprovedCoach(request)
  const formData = await request.formData()
  const payloadRaw = formData.get("payload")?.toString() ?? ""
  const parsed = parseWorkoutBuilderPayload(payloadRaw)

  if (!parsed.success) {
    return {
      fieldErrors: getWorkoutBuilderFieldErrors(parsed.error),
    }
  }

  const updated = await updateWorkoutTemplate(user.id, params.templateId, parsed.data)

  if (!updated) {
    throw new Response("Workout not found", { status: 404 })
  }

  throw redirect("/dashboard/workouts")
}

export default function CoachEditWorkout() {
  const { exercises, template } = useLoaderData<typeof loader>()
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

        <h1 className="text-3xl font-semibold tracking-tight">Edit workout</h1>
        <p className="mt-2 text-muted-foreground">
          Update {template.title} in your workout library.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarBlankIcon className="size-5 text-primary" />
            Workout builder
          </CardTitle>
          <CardDescription>
            Adjust blocks, exercises, and prescriptions for this template.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkoutBuilder
            exercises={exercises}
            defaultTemplate={template}
            fieldErrors={actionData?.fieldErrors}
            submitLabel="Save workout"
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  )
}
