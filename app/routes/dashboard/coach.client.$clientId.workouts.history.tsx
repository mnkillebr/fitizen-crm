import { ArrowLeftIcon, ClockCounterClockwiseIcon } from "@phosphor-icons/react"
import { Link, useLoaderData } from "react-router"

import type { Route } from "./+types/coach.client.$clientId.workouts.history"
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
import { requireApprovedCoach } from "~/lib/auth.server"
import { getCoachClientById } from "../../../models/client.server"
import { getCompletedLogsForClient } from "../../../models/workout.server"

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireApprovedCoach(request)
  const client = await getCoachClientById(user.id, params.clientId)

  if (!client) {
    throw new Response("Client not found", { status: 404 })
  }

  const logs = await getCompletedLogsForClient(user.id, params.clientId)

  return { client, logs }
}

export default function CoachClientWorkoutHistory() {
  const { client, logs } = useLoaderData<typeof loader>()

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-4" asChild>
          <Link to={`/dashboard/coach/client/${client.id}`}>
            <ArrowLeftIcon />
            Back to {client.name}
          </Link>
        </Button>

        <h1 className="text-3xl font-semibold tracking-tight">Workout history</h1>
        <p className="mt-2 text-muted-foreground">
          All completed sessions for {client.name}.
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
              <CardDescription>Review past session logs and performance.</CardDescription>
            </div>
            <Badge variant="secondary">{logs.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <WorkoutHistoryTable clientId={client.id} logs={logs} />
        </CardContent>
      </Card>
    </div>
  )
}
