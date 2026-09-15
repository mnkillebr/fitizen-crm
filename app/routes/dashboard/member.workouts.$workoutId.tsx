import { ArrowLeftIcon, CalendarBlankIcon } from "@phosphor-icons/react"
import { Link, redirect, useLoaderData } from "react-router"

import type { Route } from "./+types/member.workouts.$workoutId"
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
import { requireRole } from "~/lib/auth.server"
import { workoutStyleLabels } from "~/lib/workout-builder"
import { workoutStatusLabels } from "~/lib/workout-log-form"
import { getMemberWorkout } from "../../../models/workout.server"

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireRole(request, "member")
  const workout = await getMemberWorkout(user.id, params.workoutId)

  if (!workout) {
    throw new Response("Workout not found", { status: 404 })
  }

  if (workout.status === "completed" || workout.status === "no_show") {
    throw redirect("/dashboard/member/workouts")
  }

  return { workout }
}

export default function MemberWorkoutPreview() {
  const { workout } = useLoaderData<typeof loader>()

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-4" asChild>
          <Link to="/dashboard/member/workouts">
            <ArrowLeftIcon />
            Back to workouts
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {workout.title ?? "Workout"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Review the prescription for your upcoming session.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{workoutStyleLabels[workout.style]}</Badge>
            <Badge variant="secondary">{workoutStatusLabels[workout.status]}</Badge>
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
            Scheduled for {new Date(workout.workoutDate).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkoutPreview workout={workout} />
        </CardContent>
      </Card>
    </div>
  )
}
