import {
  ArrowLeftIcon,
  BarbellIcon,
  CaretLeftIcon,
  CaretRightIcon,
  PlusIcon,
} from "@phosphor-icons/react"
import { Link, useActionData, useLoaderData } from "react-router"

import type { Route } from "./+types/coach.exercises"
import { ExercisesFilters } from "~/components/exercises-filters"
import { ExercisesTable } from "~/components/exercises-table"
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
import {
  createExerciseListSearchParams,
  EXERCISE_LIST_PAGE_SIZE,
  hasActiveExerciseFilters,
  parseCoachExerciseListParams,
} from "~/lib/exercise-list-params"
import {
  deleteCoachExercise,
  listCoachExercises,
  type CoachExerciseFilters,
} from "../../../models/exercise.server"

function toExerciseListSearch(
  filters: CoachExerciseFilters,
  updates: { page: number }
) {
  const params = createExerciseListSearchParams(filters, updates)
  const value = params.toString()
  return value ? `?${value}` : ""
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireApprovedCoach(request)
  const { filters, page } = parseCoachExerciseListParams(
    new URL(request.url).searchParams
  )
  const result = await listCoachExercises(user.id, filters, {
    page,
    pageSize: EXERCISE_LIST_PAGE_SIZE,
  })

  return { ...result, filters }
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireApprovedCoach(request)
  const formData = await request.formData()
  const intent = formData.get("intent")

  if (intent !== "delete-exercise") {
    return null
  }

  const exerciseId = formData.get("exerciseId")?.toString()

  if (!exerciseId) {
    return { deleteError: "Exercise not found." }
  }

  const result = await deleteCoachExercise(user.id, exerciseId)

  if (!result.ok) {
    if (result.reason === "in_use") {
      return {
        deleteError:
          "This exercise is used in workouts or logs and cannot be deleted.",
      }
    }

    if (result.reason === "system") {
      return {
        deleteError: "System library exercises cannot be deleted.",
      }
    }

    return { deleteError: "Exercise not found." }
  }

  return { deletedExerciseName: result.exercise.name }
}

export default function CoachExercises() {
  const { exercises, total, page, totalPages, filters } =
    useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const filtersActive = hasActiveExerciseFilters(filters)

  // Empty string is a valid page-1 URL (no query); only null means unavailable.
  const prevSearch =
    page > 1
      ? toExerciseListSearch(filters, { page: page - 1 })
      : null
  const nextSearch =
    page < totalPages
      ? toExerciseListSearch(filters, { page: page + 1 })
      : null
  const canGoPrev = prevSearch !== null
  const canGoNext = nextSearch !== null
  const prevTo =
    prevSearch === null
      ? null
      : prevSearch === ""
        ? "/dashboard/exercises"
        : { search: prevSearch }
  const nextTo =
    nextSearch === null
      ? null
      : nextSearch === ""
        ? "/dashboard/exercises"
        : { search: nextSearch }

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-4" asChild>
          <Link to="/dashboard">
            <ArrowLeftIcon />
            Back to dashboard
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Exercises</h1>
            <p className="mt-2 text-muted-foreground">
              Manage the movements in your exercise catalog.
            </p>
          </div>

          <Button asChild>
            <Link to="/dashboard/exercises/new">
              <PlusIcon />
              Create exercise
            </Link>
          </Button>
        </div>
      </div>

      {actionData?.deleteError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {actionData.deleteError}
        </div>
      ) : null}

      {actionData?.deletedExerciseName ? (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
          {actionData.deletedExerciseName} was deleted.
        </div>
      ) : null}

      <ExercisesFilters filters={filters} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarbellIcon className="size-5 text-primary" />
                Exercise catalog
              </CardTitle>
              <CardDescription>
                System library exercises plus movements you have created for
                your clients.
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {total} {filtersActive ? "matching" : "total"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ExercisesTable
            exercises={exercises}
            emptyTitle={
              filtersActive ? "No matching exercises" : "No exercises yet"
            }
            emptyDescription={
              filtersActive
                ? "Try adjusting or clearing your filters."
                : "Create your first exercise to start building workout prescriptions."
            }
          />

          {totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canGoPrev}
                  asChild={canGoPrev}
                >
                  {prevTo ? (
                    <Link to={prevTo} className="flex items-center gap-2">
                      <CaretLeftIcon />
                      Previous
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CaretLeftIcon />
                      Previous
                    </div>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canGoNext}
                  asChild={canGoNext}
                >
                  {nextTo ? (
                    <Link to={nextTo} className="flex items-center gap-2">
                      Next
                      <CaretRightIcon />
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2">
                      Next
                      <CaretRightIcon />
                    </div>
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
