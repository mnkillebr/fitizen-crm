import { MagnifyingGlassIcon } from "@phosphor-icons/react"
import { Form, Link } from "react-router"

import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
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
import type { CoachExerciseFilters } from "../../models/exercise.server"

const ALL = "all"

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
          <Select
            name="muscleGroup"
            defaultValue={filters.muscleGroup ?? ALL}
          >
            <SelectTrigger
              id="exercise-catalog-muscle-group"
              className="w-full"
            >
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Muscle group</SelectLabel>
                <SelectItem value={ALL}>All</SelectItem>
                {exerciseMuscleGroupValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {exerciseMuscleGroupLabels[value]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exercise-catalog-plane">Plane of motion</Label>
          <Select
            name="planeOfMotion"
            defaultValue={filters.planeOfMotion ?? ALL}
          >
            <SelectTrigger id="exercise-catalog-plane" className="w-full">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Plane of motion</SelectLabel>
                <SelectItem value={ALL}>All</SelectItem>
                {exercisePlaneOfMotionValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {exercisePlaneOfMotionLabels[value]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exercise-catalog-equipment">Equipment</Label>
          <Select name="equipment" defaultValue={filters.equipment ?? ALL}>
            <SelectTrigger id="exercise-catalog-equipment" className="w-full">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Equipment</SelectLabel>
                <SelectItem value={ALL}>All</SelectItem>
                {exerciseEquipmentValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {exerciseEquipmentLabels[value]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exercise-catalog-support">Support</Label>
          <Select name="support" defaultValue={filters.support ?? ALL}>
            <SelectTrigger id="exercise-catalog-support" className="w-full">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Support</SelectLabel>
                <SelectItem value={ALL}>All</SelectItem>
                {exerciseSupportValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {exerciseSupportLabels[value]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
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
