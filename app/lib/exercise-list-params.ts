import {
  exerciseEquipmentValues,
  exerciseMuscleGroupValues,
  exercisePlaneOfMotionValues,
  exerciseSupportValues,
} from "~/lib/exercise-form"
import type {
  CoachExerciseFilters,
  ExerciseEquipmentValue,
  ExerciseMuscleGroupValue,
  ExercisePlaneOfMotionValue,
  ExerciseSupportValue,
} from "../../models/exercise.server"

export const EXERCISE_LIST_PAGE_SIZE = 25

export type CoachExerciseListParams = {
  filters: CoachExerciseFilters
  page: number
}

function parseEnumValue<T extends string>(
  value: string | null,
  allowed: readonly T[]
): T | undefined {
  if (!value) {
    return undefined
  }

  return (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined
}

export function parseCoachExerciseListParams(
  searchParams: URLSearchParams
): CoachExerciseListParams {
  const search = searchParams.get("q")?.trim() || undefined

  const filters: CoachExerciseFilters = {
    search,
    muscleGroup: parseEnumValue<ExerciseMuscleGroupValue>(
      searchParams.get("muscleGroup"),
      exerciseMuscleGroupValues
    ),
    planeOfMotion: parseEnumValue<ExercisePlaneOfMotionValue>(
      searchParams.get("planeOfMotion"),
      exercisePlaneOfMotionValues
    ),
    support: parseEnumValue<ExerciseSupportValue>(
      searchParams.get("support"),
      exerciseSupportValues
    ),
    equipment: parseEnumValue<ExerciseEquipmentValue>(
      searchParams.get("equipment"),
      exerciseEquipmentValues
    ),
  }

  const rawPage = Number.parseInt(searchParams.get("page") ?? "1", 10)
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1

  return { filters, page }
}

export function hasActiveExerciseFilters(filters: CoachExerciseFilters) {
  return Boolean(
    filters.search ||
      filters.muscleGroup ||
      filters.planeOfMotion ||
      filters.support ||
      filters.equipment
  )
}

export function createExerciseListSearchParams(
  current: URLSearchParams | CoachExerciseFilters,
  updates: Partial<CoachExerciseFilters> & { page?: number | null } = {}
) {
  const next = new URLSearchParams()

  const currentFilters: CoachExerciseFilters =
    current instanceof URLSearchParams
      ? parseCoachExerciseListParams(current).filters
      : current

  const filters: CoachExerciseFilters = {
    search:
      updates.search !== undefined ? updates.search : currentFilters.search,
    muscleGroup:
      updates.muscleGroup !== undefined
        ? updates.muscleGroup
        : currentFilters.muscleGroup,
    planeOfMotion:
      updates.planeOfMotion !== undefined
        ? updates.planeOfMotion
        : currentFilters.planeOfMotion,
    support:
      updates.support !== undefined ? updates.support : currentFilters.support,
    equipment:
      updates.equipment !== undefined
        ? updates.equipment
        : currentFilters.equipment,
  }

  if (filters.search?.trim()) {
    next.set("q", filters.search.trim())
  }

  if (filters.muscleGroup) {
    next.set("muscleGroup", filters.muscleGroup)
  }

  if (filters.planeOfMotion) {
    next.set("planeOfMotion", filters.planeOfMotion)
  }

  if (filters.support) {
    next.set("support", filters.support)
  }

  if (filters.equipment) {
    next.set("equipment", filters.equipment)
  }

  if (updates.page != null && updates.page > 1) {
    next.set("page", String(updates.page))
  }

  return next
}
