import { ArrowLeftIcon, CalendarBlankIcon, PlusIcon } from "@phosphor-icons/react"
import { Link, useActionData, useLoaderData } from "react-router"

import type { Route } from "./+types/coach.workouts"
import { WorkoutsTable } from "~/components/workouts-table"
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
import { getCoachClientRows } from "../../../models/client.server"
import {
  assignTemplateToClient,
  deleteCoachTemplate,
  getCoachWorkoutTemplates,
} from "../../../models/workout-template.server"

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireApprovedCoach(request)
  const [templates, clientRows] = await Promise.all([
    getCoachWorkoutTemplates(user.id),
    getCoachClientRows(user.id),
  ])

  const clients = clientRows
    .filter((client) => client.status === "active")
    .map((client) => ({
      id: client.id,
      name: client.name,
      email: client.email,
      joinedAt: client.date,
    }))

  return { templates, clients }
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireApprovedCoach(request)
  const formData = await request.formData()
  const intent = formData.get("intent")

  if (intent === "delete-workout") {
    const templateId = formData.get("templateId")?.toString()

    if (!templateId) {
      return { deleteError: "Workout not found." }
    }

    const result = await deleteCoachTemplate(user.id, templateId)

    if (!result.ok) {
      return { deleteError: "Workout not found." }
    }

    return { deletedWorkoutTitle: result.template.title }
  }

  if (intent === "assign-workout") {
    const templateId = formData.get("templateId")?.toString()
    const memberId = formData.get("memberId")?.toString()
    const workoutDateRaw = formData.get("workoutDate")?.toString()

    if (!templateId || !memberId || !workoutDateRaw) {
      return { assignError: "Client and workout date are required." }
    }

    const workoutDate = new Date(`${workoutDateRaw}T12:00:00`)

    if (Number.isNaN(workoutDate.getTime())) {
      return { assignError: "Enter a valid workout date." }
    }

    const result = await assignTemplateToClient(
      user.id,
      templateId,
      memberId,
      workoutDate
    )

    if (!result.ok) {
      if (result.reason === "client_not_found") {
        return { assignError: "Selected client was not found on your roster." }
      }

      return { assignError: "Workout template not found." }
    }

    return { assignedWorkout: true }
  }

  return null
}

export default function CoachWorkouts() {
  const { templates, clients } = useLoaderData<typeof loader>()
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
            <h1 className="text-3xl font-semibold tracking-tight">Workouts</h1>
            <p className="mt-2 text-muted-foreground">
              Build reusable workout templates and assign them to clients.
            </p>
          </div>

          <Button asChild>
            <Link to="/dashboard/workouts/new">
              <PlusIcon />
              Create workout
            </Link>
          </Button>
        </div>
      </div>

      {actionData?.deleteError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {actionData.deleteError}
        </div>
      ) : null}

      {actionData?.deletedWorkoutTitle ? (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
          {actionData.deletedWorkoutTitle} was deleted.
        </div>
      ) : null}

      {actionData?.assignError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {actionData.assignError}
        </div>
      ) : null}

      {actionData?.assignedWorkout ? (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
          Workout assigned to client successfully.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarBlankIcon className="size-5 text-primary" />
                Workout library
              </CardTitle>
              <CardDescription>
                Edit, delete, or assign templates from your workout catalog.
              </CardDescription>
            </div>
            <Badge variant="secondary">{templates.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <WorkoutsTable templates={templates} clients={clients} />
        </CardContent>
      </Card>
    </div>
  )
}
