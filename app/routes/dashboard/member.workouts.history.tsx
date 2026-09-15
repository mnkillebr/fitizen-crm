import { ArrowLeftIcon, ClockCounterClockwiseIcon } from "@phosphor-icons/react"
import { Link, useLoaderData } from "react-router"

import type { Route } from "./+types/member.workouts.history"
import { WorkoutHistoryTable } from "~/components/workout-history-table"
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
import { getCompletedLogsForMember } from "../../../models/workout.server"

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireRole(request, "member")
  const logs = await getCompletedLogsForMember(user.id)

  return { logs }
}

export default function MemberWorkoutHistory() {
  const { logs } = useLoaderData<typeof loader>()

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-4" asChild>
          <Link to="/dashboard/member/workouts">
            <ArrowLeftIcon />
            Back to workouts
          </Link>
        </Button>

        <h1 className="text-3xl font-semibold tracking-tight">Workout history</h1>
        <p className="mt-2 text-muted-foreground">
          All of your completed training sessions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClockCounterClockwiseIcon className="size-5 text-primary" />
                Completed workouts
              </CardTitle>
              <CardDescription>
                Review past sessions and leave feedback for your coach.
              </CardDescription>
            </div>
            <Badge variant="secondary">{logs.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <WorkoutHistoryTable
            logs={logs}
            reviewLabel="View"
            getReviewHref={(log) => `/dashboard/member/workout-log/${log.logId}`}
          />
        </CardContent>
      </Card>
    </div>
  )
}
