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

const ALL = "all"

export function ExercisePicker({
  exercises,
  onSelect,
  excludeExerciseIds = [],
}: ExercisePickerProps) {
  const [search, setSearch] = useState("")
  const [muscleGroup, setMuscleGroup] = useState("")
  const [planeOfMotion, setPlaneOfMotion] = useState("")
  const [equipment, setEquipment] = useState("")
  const [support, setSupport] = useState("")

  const filteredExercises = useMemo(() => {
    const query = search.trim().toLowerCase()
    const excluded = new Set(excludeExerciseIds)

    return exercises.filter((exercise) => {
      if (excluded.has(exercise.id)) {
        return false
      }

      if (muscleGroup && exercise.muscleGroup !== muscleGroup) {
        return false
      }

      if (planeOfMotion && exercise.planeOfMotion !== planeOfMotion) {
        return false
      }

      if (equipment && exercise.equipment !== equipment) {
        return false
      }

      if (support && exercise.support !== support) {
        return false
      }

      if (query && !exercise.name.toLowerCase().includes(query)) {
        return false
      }

      return true
    })
  }, [exercises, excludeExerciseIds, search, muscleGroup, planeOfMotion, equipment, support])

  return (
    <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
      <div className="flex items-center gap-2">
        <MagnifyingGlassIcon className="size-4 text-muted-foreground" />
        <p className="text-sm font-medium">Add exercise</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
          <Label htmlFor="exercise-search">Search</Label>
          <Input
            id="exercise-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name..."
          />
        </div>

        <div className="space-y-1.5">
          <Label>Muscle group</Label>
          <Select
            value={muscleGroup || ALL}
            onValueChange={(value) => setMuscleGroup(value === ALL ? "" : value)}
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
            value={planeOfMotion || ALL}
            onValueChange={(value) => setPlaneOfMotion(value === ALL ? "" : value)}
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
            value={equipment || ALL}
            onValueChange={(value) => setEquipment(value === ALL ? "" : value)}
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
            value={support || ALL}
            onValueChange={(value) => setSupport(value === ALL ? "" : value)}
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
