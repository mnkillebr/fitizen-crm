import { ArrowLeftIcon, BarbellIcon } from "@phosphor-icons/react"
import { Form, Link, redirect, useActionData, useNavigation } from "react-router"

import type { Route } from "./+types/coach.exercises.new"
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
import { createCoachExercise } from "../../../models/exercise.server"

export async function loader({ request }: Route.LoaderArgs) {
  await requireApprovedCoach(request)

  return null
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireApprovedCoach(request)
  const formData = await request.formData()
  const parsed = parseExerciseFormData(formData)

  if (!parsed.success) {
    return {
      fieldErrors: getExerciseFormFieldErrors(parsed.error),
    }
  }

  await createCoachExercise(user.id, {
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    muscleGroup: parsed.data.muscleGroup,
    planeOfMotion: parsed.data.planeOfMotion,
    support: parsed.data.support,
    equipment: parsed.data.equipment,
  })

  throw redirect("/dashboard/coach/exercises")
}

export default function CoachCreateExercise() {
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

        <h1 className="text-3xl font-semibold tracking-tight">Create exercise</h1>
        <p className="mt-2 text-muted-foreground">
          Add a reusable exercise to your catalog for workout prescriptions.
        </p>
      </div>

      <Card className="max-w-4xl">
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
            <ExerciseFormFields fieldErrors={actionData?.fieldErrors} />

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create exercise"}
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
