import { z } from "zod"

import {
  nutritionActivityLevelValues,
  nutritionGoalValues,
  nutritionSexValues,
  type NutritionActivityLevelValue,
  type NutritionGoalValue,
  type NutritionSexValue,
} from "~/lib/tdee"

export const nutritionSexLabels: Record<NutritionSexValue, string> = {
  male: "Male",
  female: "Female",
}

export const nutritionActivityLevelLabels: Record<
  NutritionActivityLevelValue,
  string
> = {
  sedentary: "Sedentary (Little or no exercise)",
  light: "Light (exercise 1-3 times/week)",
  moderate: "Moderate (exercise 4-5 times/week)",
  active: "Active (daily exercise or intense exercise 3-4 times/week)",
  very_active: "Very active (intense exercise 6-7 times/week)",
  extra_active: "Extra active (very intense exercise daily, or physical job)",
}

export const nutritionGoalLabels: Record<NutritionGoalValue, string> = {
  maintain: "Maintain weight",
  mild_loss: "Mild weight loss (0.5 lb/week)",
  moderate_loss: "Moderate weight loss (1 lb/week)",
  mild_gain: "Mild weight gain (0.5 lb/week)",
  moderate_gain: "Moderate weight gain (1 lb/week)",
}

const requiredInt = (label: string, min: number, max: number) =>
  z.coerce
    .number({ error: `${label} is required` })
    .int(`${label} must be a whole number`)
    .min(min, `${label} must be at least ${min}`)
    .max(max, `${label} must be at most ${max}`)

const requiredNumber = (label: string, min: number, max: number) =>
  z.coerce
    .number({ error: `${label} is required` })
    .min(min, `${label} must be at least ${min}`)
    .max(max, `${label} must be at most ${max}`)

export const nutritionFormSchema = z
  .object({
    age: requiredInt("Age", 1, 120),
    sex: z.enum(nutritionSexValues, { error: "Select male or female" }),
    heightFeet: z.coerce.number().int().min(3, "Enter a valid height").max(8),
    heightInches: z.coerce
      .number()
      .min(0, "Enter a valid height")
      .max(11.9, "Inches must be less than 12"),
    weightLbs: requiredNumber("Weight", 50, 700),
    activityLevel: z.enum(nutritionActivityLevelValues, {
      error: "Select an activity level",
    }),
    goal: z.enum(nutritionGoalValues, { error: "Select a goal" }),
    useCustomMacros: z.boolean().default(false),
    proteinPercent: z.coerce.number().int().min(0).max(100).optional(),
    carbsPercent: z.coerce.number().int().min(0).max(100).optional(),
    fatPercent: z.coerce.number().int().min(0).max(100).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.useCustomMacros) return

    const protein = data.proteinPercent
    const carbs = data.carbsPercent
    const fat = data.fatPercent

    if (protein == null) {
      ctx.addIssue({
        code: "custom",
        message: "Protein percent is required",
        path: ["proteinPercent"],
      })
    }
    if (carbs == null) {
      ctx.addIssue({
        code: "custom",
        message: "Carbs percent is required",
        path: ["carbsPercent"],
      })
    }
    if (fat == null) {
      ctx.addIssue({
        code: "custom",
        message: "Fat percent is required",
        path: ["fatPercent"],
      })
    }

    if (protein == null || carbs == null || fat == null) return

    if (protein + carbs + fat !== 100) {
      ctx.addIssue({
        code: "custom",
        message: "Custom macros must total 100%",
        path: ["proteinPercent"],
      })
    }
  })
  .transform((data) => ({
    age: data.age,
    sex: data.sex,
    heightFeet: data.heightFeet,
    heightInches: data.heightInches,
    totalHeightInches: data.heightFeet * 12 + data.heightInches,
    weightLbs: data.weightLbs,
    activityLevel: data.activityLevel,
    goal: data.goal,
    useCustomMacros: data.useCustomMacros,
    macros: data.useCustomMacros
      ? {
          proteinPercent: data.proteinPercent!,
          carbsPercent: data.carbsPercent!,
          fatPercent: data.fatPercent!,
        }
      : undefined,
  }))

export type NutritionFormValues = z.infer<typeof nutritionFormSchema>

export type NutritionFormFieldErrors = Partial<{
  age: string
  sex: string
  heightFeet: string
  heightInches: string
  weightLbs: string
  activityLevel: string
  goal: string
  proteinPercent: string
  carbsPercent: string
  fatPercent: string
  formError: string
}>

export function parseNutritionFormData(formData: FormData) {
  return nutritionFormSchema.safeParse({
    age: formData.get("age"),
    sex: formData.get("sex"),
    heightFeet: formData.get("heightFeet"),
    heightInches: formData.get("heightInches"),
    weightLbs: formData.get("weightLbs"),
    activityLevel: formData.get("activityLevel"),
    goal: formData.get("goal"),
    useCustomMacros: formData.get("useCustomMacros") === "on",
    proteinPercent: formData.get("proteinPercent") || undefined,
    carbsPercent: formData.get("carbsPercent") || undefined,
    fatPercent: formData.get("fatPercent") || undefined,
  })
}

export function getNutritionFormFieldErrors(
  error: z.ZodError
): NutritionFormFieldErrors {
  const fieldErrors = error.flatten().fieldErrors as Partial<
    Record<keyof NutritionFormFieldErrors, string[] | undefined>
  >

  return {
    age: fieldErrors.age?.[0],
    sex: fieldErrors.sex?.[0],
    heightFeet: fieldErrors.heightFeet?.[0],
    heightInches: fieldErrors.heightInches?.[0],
    weightLbs: fieldErrors.weightLbs?.[0],
    activityLevel: fieldErrors.activityLevel?.[0],
    goal: fieldErrors.goal?.[0],
    proteinPercent: fieldErrors.proteinPercent?.[0],
    carbsPercent: fieldErrors.carbsPercent?.[0],
    fatPercent: fieldErrors.fatPercent?.[0],
  }
}

export function splitHeightInches(totalInches: number) {
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round((totalInches - feet * 12) * 10) / 10
  return { heightFeet: feet, heightInches: inches }
}
