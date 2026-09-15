import { ArrowLeftIcon, ChatCircleIcon, ClockCounterClockwiseIcon } from "@phosphor-icons/react"
import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router"

import type { Route } from "./+types/member.workout-log.$logId"
import { WorkoutLogForm } from "~/components/workout-log-form"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { Label } from "~/components/ui/label"
import { Textarea } from "~/components/ui/textarea"
import { requireRole } from "~/lib/auth.server"
import { workoutStyleLabels } from "~/lib/workout-builder"
import { workoutLogStatusLabels } from "~/lib/workout-log-form"
import {
  getMemberWorkout,
  getMemberWorkoutLog,
  getWorkoutLogWithEntries,
  updateMemberWorkoutFeedback,
} from "../../../models/workout.server"

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireRole(request, "member")
  const log = await getMemberWorkoutLog(user.id, params.logId)

  if (!log) {
    throw new Response("Workout log not found", { status: 404 })
  }

  if (log.status !== "completed") {
    throw redirect("/dashboard/member/workouts")
  }

  const logWithEntries = await getWorkoutLogWithEntries(params.logId)
  if (!logWithEntries) {
    throw new Response("Workout log not found", { status: 404 })
  }

  const workout = log.workoutId
    ? await getMemberWorkout(user.id, log.workoutId)
    : null

  if (!workout) {
    throw new Response("Workout not found", { status: 404 })
  }

  return { workout, log: logWithEntries }
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireRole(request, "member")
  const formData = await request.formData()
  const intent = formData.get("intent")?.toString()

  if (intent !== "save-feedback") {
    return null
  }

  const feedback = formData.get("memberFeedback")?.toString() ?? ""

  if (feedback.trim().length > 2000) {
    return { error: "Feedback must be 2000 characters or fewer." }
  }

  const result = await updateMemberWorkoutFeedback(
    user.id,
    params.logId,
    feedback
  )

  if (!result) {
    return { error: "Unable to save feedback for this workout." }
  }

  throw redirect(`/dashboard/member/workout-log/${params.logId}`)
}

export default function MemberWorkoutLogReview() {
  const { workout, log } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === "submitting"

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-4" asChild>
          <Link to="/dashboard/member/workouts/history">
            <ArrowLeftIcon />
            Back to Workout History
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {workout.title ?? "Workout review"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Review your completed session and leave feedback for your coach.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{workoutStyleLabels[workout.style]}</Badge>
            <Badge variant="secondary">{workoutLogStatusLabels[log.status]}</Badge>
          </div>
        </div>
      </div>

      {actionData?.error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {actionData.error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClockCounterClockwiseIcon className="size-5 text-primary" />
            Completed session
          </CardTitle>
          <CardDescription>
            Completed {log.completedAt ? new Date(log.completedAt).toLocaleString() : "—"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkoutLogForm
            workout={workout}
            defaultEntries={log.entries}
            defaultNotes={log.notes}
            mode="edit"
            isCompleted
            allowEdit={false}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ChatCircleIcon className="size-5 text-primary" />
            Your feedback
          </CardTitle>
          <CardDescription>
            Share how the session felt, what went well, or what to adjust next time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="save-feedback" />
            <div className="space-y-1.5">
              <Label htmlFor="member-feedback">Comments</Label>
              <Textarea
                id="member-feedback"
                name="memberFeedback"
                defaultValue={log.memberFeedback ?? ""}
                rows={5}
                maxLength={2000}
                placeholder="Energy, recovery, equipment access, preferred swaps…"
              />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save feedback"}
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
