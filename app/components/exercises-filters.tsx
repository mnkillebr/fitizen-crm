import { MagnifyingGlassIcon } from "@phosphor-icons/react"
import { Form, Link } from "react-router"

import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import {
  exerciseEquipmentLabels,
  exerciseEquipmentValues,
  exerciseMuscleGroupLabels,
  exerciseMuscleGroupValues,
  exercisePlaneOfMotionLabels,
  exercisePlaneOfMotionValues,
  exerciseSupportLabels,
  exerciseSupportValues,
} from "~/lib/exercise-form"
import { hasActiveExerciseFilters } from "~/lib/exercise-list-params"
import { cn } from "~/lib/utils"
import type { CoachExerciseFilters } from "../../models/exercise.server"

const selectClassName = cn(
  "h-7 w-full min-w-0 rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm outline-none",
  "transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  "md:text-xs/relaxed dark:bg-input/30"
)

type ExercisesFiltersProps = {
  filters: CoachExerciseFilters
}

export function ExercisesFilters({ filters }: ExercisesFiltersProps) {
  const showClear = hasActiveExerciseFilters(filters)

  return (
    <Form method="get" className="space-y-4 rounded-lg border bg-muted/10 p-4">
      <div className="flex items-center gap-2">
        <MagnifyingGlassIcon className="size-4 text-muted-foreground" />
        <p className="text-sm font-medium">Filter exercises</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
          <Label htmlFor="exercise-catalog-search">Search</Label>
          <Input
            id="exercise-catalog-search"
            name="q"
            defaultValue={filters.search ?? ""}
            placeholder="Search by name..."
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exercise-catalog-muscle-group">Muscle group</Label>
          <select
            id="exercise-catalog-muscle-group"
            name="muscleGroup"
            defaultValue={filters.muscleGroup ?? ""}
            className={selectClassName}
          >
            <option value="">All</option>
            {exerciseMuscleGroupValues.map((value) => (
              <option key={value} value={value}>
                {exerciseMuscleGroupLabels[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exercise-catalog-plane">Plane of motion</Label>
          <select
            id="exercise-catalog-plane"
            name="planeOfMotion"
            defaultValue={filters.planeOfMotion ?? ""}
            className={selectClassName}
          >
            <option value="">All</option>
            {exercisePlaneOfMotionValues.map((value) => (
              <option key={value} value={value}>
                {exercisePlaneOfMotionLabels[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exercise-catalog-equipment">Equipment</Label>
          <select
            id="exercise-catalog-equipment"
            name="equipment"
            defaultValue={filters.equipment ?? ""}
            className={selectClassName}
          >
            <option value="">All</option>
            {exerciseEquipmentValues.map((value) => (
              <option key={value} value={value}>
                {exerciseEquipmentLabels[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exercise-catalog-support">Support</Label>
          <select
            id="exercise-catalog-support"
            name="support"
            defaultValue={filters.support ?? ""}
            className={selectClassName}
          >
            <option value="">All</option>
            {exerciseSupportValues.map((value) => (
              <option key={value} value={value}>
                {exerciseSupportLabels[value]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm">
          Apply filters
        </Button>
        {showClear ? (
          <Button type="button" variant="ghost" size="sm" asChild>
            <Link to="/dashboard/exercises">Clear</Link>
          </Button>
        ) : null}
      </div>
    </Form>
  )
}
