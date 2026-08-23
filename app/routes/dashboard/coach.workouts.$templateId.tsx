import { ArrowLeftIcon, CalendarBlankIcon, PencilSimpleIcon } from "@phosphor-icons/react"
import { Link, useLoaderData } from "react-router"

import type { Route } from "./+types/coach.workouts.$templateId"
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
import { workoutStyleLabels } from "~/lib/workout-builder"
import { requireApprovedCoach } from "~/lib/auth.server"
import { getCoachExercises } from "../../../models/exercise.server"
import { getTemplateWithDetails } from "../../../models/workout-template.server"

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

export default function CoachViewWorkout() {
  const { template } = useLoaderData<typeof loader>()

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-4" asChild>
          <Link to="/dashboard/workouts">
            <ArrowLeftIcon />
            Back to workouts
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{template.title}</h1>
            <p className="mt-2 text-muted-foreground">
              Review this workout template from your library.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{workoutStyleLabels[template.style]}</Badge>
            <Button asChild>
              <Link to={`/dashboard/workouts/${template.id}/edit`}>
                <PencilSimpleIcon />
                Edit workout
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarBlankIcon className="size-5 text-primary" />
            Workout preview
          </CardTitle>
          <CardDescription>
            Blocks, exercises, and prescriptions for this template.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkoutPreview workout={template} />
        </CardContent>
      </Card>
    </div>
  )
}
