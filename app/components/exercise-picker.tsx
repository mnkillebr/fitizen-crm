import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react"
import { useMemo, useState } from "react"

import { Badge } from "~/components/ui/badge"
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
import type { ExerciseSelect } from "../../models/exercise.server"

type ExercisePickerProps = {
  exercises: ExerciseSelect[]
  onSelect: (exercise: ExerciseSelect) => void
  excludeExerciseIds?: string[]
}

type PickerFilters = {
  search: string
  muscleGroup: string
  planeOfMotion: string
  equipment: string
  support: string
}

const ALL = "all"

const EMPTY_FILTERS: PickerFilters = {
  search: "",
  muscleGroup: "",
  planeOfMotion: "",
  equipment: "",
  support: "",
}

function hasActivePickerFilters(filters: PickerFilters) {
  return (
    filters.search.trim() !== "" ||
    filters.muscleGroup !== "" ||
    filters.planeOfMotion !== "" ||
    filters.equipment !== "" ||
    filters.support !== ""
  )
}

export function ExercisePicker({
  exercises,
  onSelect,
  excludeExerciseIds = [],
}: ExercisePickerProps) {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const showClear = hasActivePickerFilters(filters)

  const filteredExercises = useMemo(() => {
    const query = filters.search.trim().toLowerCase()
    const excluded = new Set(excludeExerciseIds)

    return exercises.filter((exercise) => {
      if (excluded.has(exercise.id)) {
        return false
      }

      if (filters.muscleGroup && exercise.muscleGroup !== filters.muscleGroup) {
        return false
      }

      if (
        filters.planeOfMotion &&
        exercise.planeOfMotion !== filters.planeOfMotion
      ) {
        return false
      }

      if (filters.equipment && exercise.equipment !== filters.equipment) {
        return false
      }

      if (filters.support && exercise.support !== filters.support) {
        return false
      }

      if (query && !exercise.name.toLowerCase().includes(query)) {
        return false
      }

      return true
    })
  }, [exercises, excludeExerciseIds, filters])

  return (
    <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MagnifyingGlassIcon className="size-4 text-muted-foreground" />
          <p className="text-sm font-medium">Add exercise</p>
        </div>
        {showClear ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setFilters(EMPTY_FILTERS)}
          >
            Clear
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
          <Label htmlFor="exercise-search">Search</Label>
          <Input
            id="exercise-search"
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                search: event.target.value,
              }))
            }
            placeholder="Search by name..."
          />
        </div>

        <div className="space-y-1.5">
          <Label>Muscle group</Label>
          <Select
            value={filters.muscleGroup || ALL}
            onValueChange={(value) =>
              setFilters((current) => ({
                ...current,
                muscleGroup: value === ALL ? "" : value,
              }))
            }
          >
            <SelectTrigger className="w-full">
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
          <Label>Plane of motion</Label>
          <Select
            value={filters.planeOfMotion || ALL}
            onValueChange={(value) =>
              setFilters((current) => ({
                ...current,
                planeOfMotion: value === ALL ? "" : value,
              }))
            }
          >
            <SelectTrigger className="w-full">
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
          <Label>Equipment</Label>
          <Select
            value={filters.equipment || ALL}
            onValueChange={(value) =>
              setFilters((current) => ({
                ...current,
                equipment: value === ALL ? "" : value,
              }))
            }
          >
            <SelectTrigger className="w-full">
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
          <Label>Support</Label>
          <Select
            value={filters.support || ALL}
            onValueChange={(value) =>
              setFilters((current) => ({
                ...current,
                support: value === ALL ? "" : value,
              }))
            }
          >
            <SelectTrigger className="w-full">
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

      <div className="max-h-64 space-y-2 overflow-y-auto">
        {filteredExercises.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No exercises match your filters.
          </p>
        ) : (
          filteredExercises.map((exercise) => (
            <div
              key={exercise.id}
              className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{exercise.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-[0.625rem]">
                    {exerciseMuscleGroupLabels[exercise.muscleGroup]}
                  </Badge>
                  <Badge variant="secondary" className="text-[0.625rem]">
                    {exerciseEquipmentLabels[exercise.equipment]}
                  </Badge>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onSelect(exercise)}
              >
                <PlusIcon />
                Add
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
