import { ArrowLeftIcon, PersonSimpleTaiChiIcon } from "@phosphor-icons/react"
import { Link, useActionData, useLoaderData } from "react-router"

import type { Route } from "./+types/coach.client.$clientId.correctives"
import { CorrectiveProtocolCard } from "~/components/corrective-protocol-card"
import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"
import { requireApprovedCoach } from "~/lib/auth.server"
import { getCoachClientById } from "../../../models/client.server"
import {
  getAssignedCorrectivesForClient,
  unassignCorrectiveFromClient,
} from "../../../models/workout.server"

type ActionData =
  | {
      removeError?: string
      removedTitle?: string
    }
  | null

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireApprovedCoach(request)
  const client = await getCoachClientById(user.id, params.clientId)

  if (!client) {
    throw new Response("Client not found", { status: 404 })
  }

  const correctives = await getAssignedCorrectivesForClient(user.id, params.clientId)

  return { client, correctives }
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireApprovedCoach(request)
  const client = await getCoachClientById(user.id, params.clientId)

  if (!client) {
    throw new Response("Client not found", { status: 404 })
  }

  const formData = await request.formData()
  const intent = formData.get("intent")?.toString()

  if (intent === "remove-corrective") {
    const workoutId = formData.get("workoutId")?.toString()

    if (!workoutId) {
      return { removeError: "Corrective protocol not found." } satisfies ActionData
    }

    const result = await unassignCorrectiveFromClient(
      user.id,
      params.clientId,
      workoutId
    )

    if (!result.ok) {
      return { removeError: "Corrective protocol not found." } satisfies ActionData
    }

    return {
      removedTitle: result.workout.title ?? "Corrective protocol",
    } satisfies ActionData
  }

  return null
}

export default function CoachClientCorrectives() {
  const { client, correctives } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

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

      {actionData && "removedTitle" in actionData && actionData.removedTitle ? (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
          Removed &ldquo;{actionData.removedTitle}&rdquo; from this client.
        </div>
      ) : null}

      {actionData && "removeError" in actionData && actionData.removeError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {actionData.removeError}
        </div>
      ) : null}

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
              canRemove
            />
          ))}
        </div>
      )}
    </div>
  )
}
