import { ArrowLeftIcon, PersonSimpleTaiChiIcon } from "@phosphor-icons/react"
import { Link, useLoaderData } from "react-router"

import type { Route } from "./+types/coach.client.$clientId.correctives"
import { CorrectiveProtocolCard } from "~/components/corrective-protocol-card"
import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"
import { requireApprovedCoach } from "~/lib/auth.server"
import { getCoachClientById } from "../../../models/client.server"
import { getAssignedCorrectivesForClient } from "../../../models/workout.server"

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireApprovedCoach(request)
  const client = await getCoachClientById(user.id, params.clientId)

  if (!client) {
    throw new Response("Client not found", { status: 404 })
  }

  const correctives = await getAssignedCorrectivesForClient(user.id, params.clientId)

  return { client, correctives }
}

export default function CoachClientCorrectives() {
  const { client, correctives } = useLoaderData<typeof loader>()

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-4" asChild>
          <Link to={`/dashboard/coach/client/${client.id}`}>
            <ArrowLeftIcon />
            Back to {client.name}
          </Link>
        </Button>

        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Corrective Protocol
          </h1>
          <p className="mt-2 text-muted-foreground">
            Stability, mobility, and activation work assigned to {client.name}.
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
                Assign a corrective protocol template from the workouts page.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {correctives.map((protocol, index) => (
            <CorrectiveProtocolCard
              key={protocol.id}
              protocol={protocol}
              description="The client should perform this corrective protocol 2-3 times per week."
              defaultOpen={index === 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
