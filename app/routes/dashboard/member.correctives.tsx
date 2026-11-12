import { ArrowLeftIcon, PersonSimpleTaiChiIcon } from "@phosphor-icons/react"
import { Link, useLoaderData } from "react-router"

import type { Route } from "./+types/member.correctives"
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
import { getAssignedCorrectivesForMember } from "../../../models/workout.server"

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireRole(request, "member")
  const correctives = await getAssignedCorrectivesForMember(user.id)

  return { correctives }
}

export default function MemberCorrectives() {
  const { correctives } = useLoaderData<typeof loader>()

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
          <h1 className="text-3xl font-semibold tracking-tight">
            Corrective Protocol
          </h1>
          <p className="mt-2 text-muted-foreground">
            Stability, mobility, and activation work assigned by your coach.
          </p>
        </div>
      </div>

      {correctives.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="rounded-md border border-dashed p-6 text-center">
              <PersonSimpleTaiChiIcon className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No corrective protocols yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Assigned protocols will appear here when your coach adds them.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {correctives.map((protocol) => (
            <Card key={protocol.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">
                      {protocol.title ?? "Corrective protocol"}
                    </CardTitle>
                    <CardDescription>
                      Peform this corrective protocol 2-3 times per week.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {workoutStyleLabels[protocol.style]}
                    </Badge>
                    <Badge variant="secondary">
                      {workoutStatusLabels[protocol.status]}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <WorkoutPreview workout={protocol} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
