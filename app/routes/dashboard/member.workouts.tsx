import {
  ArrowLeftIcon,
  CalendarBlankIcon,
  ClockCounterClockwiseIcon,
} from "@phosphor-icons/react"
import { Link, useLoaderData } from "react-router"

import type { Route } from "./+types/member.workouts"
import { StrengthTrends } from "~/components/strength-trends"
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
import {
  buildStrengthTrendSlides,
  getUniqueExerciseIds,
  parseTrendIndex,
  resolveTrendSelections,
} from "~/lib/strength-trends"
import { workoutStyleLabels } from "~/lib/workout-builder"
import { workoutStatusLabels } from "~/lib/workout-log-form"
import {
  getExerciseLogEntries,
  getLoggedExercisesForMember,
  type ExerciseLogVolumePoint,
} from "../../../models/exercise.server"
import {
  getPreviousCompletedLogForMember,
  getUpcomingWorkoutForMember,
} from "../../../models/workout.server"

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireRole(request, "member")
  const searchParams = new URL(request.url).searchParams

  const [upcomingWorkout, previousWorkout, loggedExercises] = await Promise.all([
    getUpcomingWorkoutForMember(user.id),
    getPreviousCompletedLogForMember(user.id),
    getLoggedExercisesForMember(user.id),
  ])

  const trendSelections = resolveTrendSelections(searchParams, loggedExercises)
  const uniqueExerciseIds = getUniqueExerciseIds(trendSelections)
  const logEntries = await Promise.all(
    uniqueExerciseIds.map((exerciseId) =>
      getExerciseLogEntries(user.id, exerciseId)
    )
  )
  const logsByExerciseId = Object.fromEntries(
    uniqueExerciseIds.map((exerciseId, index) => [
      exerciseId,
      logEntries[index] as ExerciseLogVolumePoint[],
    ])
  )
  const trendSlides = buildStrengthTrendSlides(
    trendSelections,
    loggedExercises,
    logsByExerciseId
  )
  const trendIndex = parseTrendIndex(searchParams.get("t"))

  return {
    upcomingWorkout,
    previousWorkout,
    loggedExercises,
    trendSlides,
    trendIndex,
  }
}

export default function MemberWorkouts() {
  const {
    upcomingWorkout,
    previousWorkout,
    loggedExercises,
    trendSlides,
    trendIndex,
  } = useLoaderData<typeof loader>()

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-4" asChild>
          <Link to="/dashboard/member">
            <ArrowLeftIcon />
            Back to dashboard
          </Link>
        </Button>

        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Workouts</h1>
          <p className="mt-2 text-muted-foreground">
            See what&apos;s coming up, review past sessions, and track your trends.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CalendarBlankIcon className="size-5 text-primary" />
            <CardTitle className="text-lg">Upcoming workout</CardTitle>
            <CardDescription>
              Your next scheduled training session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingWorkout ? (
              <Link
                to={`/dashboard/member/workouts/${upcomingWorkout.id}`}
                className="block rounded-md border p-4 transition-colors hover:border-primary/40 hover:bg-muted/20"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {upcomingWorkout.title ?? "Scheduled workout"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(upcomingWorkout.workoutDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {workoutStyleLabels[upcomingWorkout.style]}
                    </Badge>
                    <Badge variant="secondary">
                      {workoutStatusLabels[upcomingWorkout.status]}
                    </Badge>
                  </div>
                </div>
                <p className="mt-3 text-xs font-medium text-primary">
                  View workout
                </p>
              </Link>
            ) : (
              <div className="rounded-md border border-dashed p-6 text-center">
                <p className="text-sm font-medium">No upcoming workout</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Assigned sessions from your coach will appear here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <ClockCounterClockwiseIcon className="size-5 text-primary" />
            <CardTitle className="text-lg">Previous workout</CardTitle>
            <CardDescription>
              Your most recently completed session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {previousWorkout ? (
              <div className="space-y-3">
                <Link
                  to={`/dashboard/member/workout-log/${previousWorkout.logId}`}
                  className="block rounded-md border p-4 transition-colors hover:border-primary/40 hover:bg-muted/20"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {previousWorkout.title ?? "Completed workout"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Completed{" "}
                        {new Date(previousWorkout.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {workoutStyleLabels[previousWorkout.style]}
                    </Badge>
                  </div>
                  <p className="mt-3 text-xs font-medium text-primary">
                    Review & leave feedback
                  </p>
                </Link>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/dashboard/member/workouts/history">View all</Link>
                </Button>
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-6 text-center">
                <p className="text-sm font-medium">No previous workout</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Completed sessions will appear here after your coach logs them.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <StrengthTrends
        exercises={loggedExercises}
        slides={trendSlides}
        trendIndex={trendIndex}
        description="Track your strength and volume over time."
      />
    </div>
  )
}
