import { ArrowLeftIcon, BarbellIcon, PlusIcon } from "@phosphor-icons/react"
import { Link, useActionData, useLoaderData } from "react-router"

import type { Route } from "./+types/coach.exercises"
import { ExercisesTable } from "~/components/exercises-table"
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
import { deleteCoachExercise, getCoachExercises } from "../../../models/exercise.server"

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireApprovedCoach(request)
  const exercises = await getCoachExercises(user.id)

  return { exercises }
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireApprovedCoach(request)
  const formData = await request.formData()
  const intent = formData.get("intent")

  if (intent !== "delete-exercise") {
    return null
  }

  const exerciseId = formData.get("exerciseId")?.toString()

  if (!exerciseId) {
    return { deleteError: "Exercise not found." }
  }

  const result = await deleteCoachExercise(user.id, exerciseId)

  if (!result.ok) {
    if (result.reason === "in_use") {
      return {
        deleteError:
          "This exercise is used in workouts or logs and cannot be deleted.",
      }
    }

    return { deleteError: "Exercise not found." }
  }

  return { deletedExerciseName: result.exercise.name }
}

export default function CoachExercises() {
  const { exercises } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-4" asChild>
          <Link to="/dashboard/coach">
            <ArrowLeftIcon />
            Back to dashboard
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Exercises</h1>
            <p className="mt-2 text-muted-foreground">
              Manage the movements in your exercise catalog.
            </p>
          </div>

          <Button asChild>
            <Link to="/dashboard/exercises/new">
              <PlusIcon />
              Create exercise
            </Link>
          </Button>
        </div>
      </div>

      {actionData?.deleteError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {actionData.deleteError}
        </div>
      ) : null}

      {actionData?.deletedExerciseName ? (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
          {actionData.deletedExerciseName} was deleted.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarbellIcon className="size-5 text-primary" />
                Exercise catalog
              </CardTitle>
              <CardDescription>
                Edit or remove exercises you have created for your clients.
              </CardDescription>
            </div>
            <Badge variant="secondary">{exercises.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ExercisesTable exercises={exercises} />
        </CardContent>
      </Card>
    </div>
  )
}
