import { ArrowLeftIcon, BarbellIcon } from "@phosphor-icons/react"
import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from "react-router"

import type { Route } from "./+types/coach.exercises.$exerciseId.edit"
import { ExerciseFormFields } from "~/components/exercise-form-fields"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import {
  getExerciseFormFieldErrors,
  parseExerciseFormData,
} from "~/lib/exercise-form"
import { requireApprovedCoach } from "~/lib/auth.server"
import {
  getCoachExerciseById,
  updateCoachExercise,
} from "../../../models/exercise.server"

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireApprovedCoach(request)
  const exercises = await getCoachExerciseById(user.id, params.exerciseId)
  const exercise = exercises[0]

  if (!exercise) {
    throw new Response("Exercise not found", { status: 404 })
  }

  return { exercise }
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireApprovedCoach(request)
  const exercises = await getCoachExerciseById(user.id, params.exerciseId)

  if (!exercises[0]) {
    throw new Response("Exercise not found", { status: 404 })
  }

  const formData = await request.formData()
  const parsed = parseExerciseFormData(formData)

  if (!parsed.success) {
    return {
      fieldErrors: getExerciseFormFieldErrors(parsed.error),
    }
  }

  const updated = await updateCoachExercise(user.id, params.exerciseId, {
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    muscleGroup: parsed.data.muscleGroup,
    planeOfMotion: parsed.data.planeOfMotion,
    support: parsed.data.support,
    equipment: parsed.data.equipment,
  })

  if (!updated) {
    throw new Response("Exercise not found", { status: 404 })
  }

  throw redirect("/dashboard/coach/exercises")
}

export default function CoachEditExercise() {
  const { exercise } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === "submitting"

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-4" asChild>
          <Link to="/dashboard/coach/exercises">
            <ArrowLeftIcon />
            Back to exercises
          </Link>
        </Button>

        <h1 className="text-3xl font-semibold tracking-tight">Edit exercise</h1>
        <p className="mt-2 text-muted-foreground">
          Update {exercise.name} in your exercise catalog.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarbellIcon className="size-5 text-primary" />
            Exercise details
          </CardTitle>
          <CardDescription>
            Name the movement and classify how it is performed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            <ExerciseFormFields
              defaultValues={exercise}
              fieldErrors={actionData?.fieldErrors}
            />

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
