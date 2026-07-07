import { z } from "zod"

import {
  ExerciseEquipment,
  ExercisePlaneOfMotion,
  ExerciseSupport,
  ExerciseMuscleGroup,
  type ExerciseEquipmentValue,
  type ExercisePlaneOfMotionValue,
  type ExerciseMuscleGroupValue,
  type ExerciseSupportValue,
} from "../../db/schema"

export const exerciseMuscleGroupValues =
  ExerciseMuscleGroup.enumValues as readonly ExerciseMuscleGroupValue[]
export const exercisePlaneOfMotionValues =
  ExercisePlaneOfMotion.enumValues as readonly ExercisePlaneOfMotionValue[]

export const exerciseSupportValues =
  ExerciseSupport.enumValues as readonly ExerciseSupportValue[]

export const exerciseEquipmentValues =
  ExerciseEquipment.enumValues as readonly ExerciseEquipmentValue[]

export type ExercisePlaneOfMotion = ExercisePlaneOfMotionValue
export type ExerciseMuscleGroup = ExerciseMuscleGroupValue
export type ExerciseSupport = ExerciseSupportValue
export type ExerciseEquipment = ExerciseEquipmentValue

export const exercisePlaneOfMotionLabels: Record<ExercisePlaneOfMotion, string> = {
  sagittal: "Sagittal",
  frontal: "Frontal",
  transverse: "Transverse",
}

export const exerciseSupportLabels: Record<ExerciseSupport, string> = {
  unilateral: "Unilateral",
  bilateral: "Bilateral",
  dynamic: "Dynamic",
}

export const exerciseMuscleGroupLabels: Record<ExerciseMuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms",
  legs: "Legs",
  core: "Core",
}

export const exerciseEquipmentLabels: Record<ExerciseEquipment, string> = {
  machine: "Machine",
  barbell: "Barbell",
  dumbbell: "Dumbbell",
  kettlebell: "Kettlebell",
  resistance_band: "Resistance band",
  cable: "Cable",
  bodyweight: "Bodyweight",
  trx: "TRX",
  rings: "Rings",
  foam_roller: "Foam roller",
  stability_ball: "Stability ball",
  medicine_ball: "Medicine ball",
  sandbag: "Sandbag",
  sled: "Sled",
  rower: "Rower",
  ski_erg: "Ski erg",
  parallettes: "Parallettes",
  trap_bar: "Trap bar",
  glider: "Glider",
  plyo_box: "Plyo box",
}

export const exerciseFormSchema = z.object({
  name: z.string().trim().min(1, "Exercise name is required").max(120),
  description: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
  muscleGroup: z.enum(exerciseMuscleGroupValues, {
    error: "Select a muscle group",
  }),
  planeOfMotion: z.enum(exercisePlaneOfMotionValues, {
    error: "Select a plane of motion",
  }),
  support: z.enum(exerciseSupportValues, {
    error: "Select unilateral or bilateral support",
  }),
  equipment: z.enum(exerciseEquipmentValues, {
    error: "Select an equipment type",
  }),
})

export type ExerciseFormValues = z.infer<typeof exerciseFormSchema>

export type ExerciseFormFieldErrors = Partial<
  Record<keyof ExerciseFormValues, string | undefined>
>

export function parseExerciseFormData(formData: FormData) {
  return exerciseFormSchema.safeParse({
    name: formData.get("name")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    muscleGroup: formData.get("muscleGroup")?.toString() ?? "",
    planeOfMotion: formData.get("planeOfMotion")?.toString() ?? "",
    support: formData.get("support")?.toString() ?? "",
    equipment: formData.get("equipment")?.toString() ?? "",
  })
}

export function getExerciseFormFieldErrors(
  error: z.ZodError<ExerciseFormValues>
): ExerciseFormFieldErrors {
  const fieldErrors = error.flatten().fieldErrors

  return {
    name: fieldErrors.name?.[0],
    description: fieldErrors.description?.[0],
    muscleGroup: fieldErrors.muscleGroup?.[0],
    planeOfMotion: fieldErrors.planeOfMotion?.[0],
    support: fieldErrors.support?.[0],
    equipment: fieldErrors.equipment?.[0],
  }
}
