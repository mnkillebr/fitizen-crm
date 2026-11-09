export const nutritionSexValues = ["male", "female"] as const
export type NutritionSexValue = (typeof nutritionSexValues)[number]

export const nutritionActivityLevelValues = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
  "extra_active",
] as const
export type NutritionActivityLevelValue =
  (typeof nutritionActivityLevelValues)[number]

export const nutritionGoalValues = [
  "maintain",
  "mild_loss",
  "moderate_loss",
  "mild_gain",
  "moderate_gain",
] as const
export type NutritionGoalValue = (typeof nutritionGoalValues)[number]

export const activityLevelMultipliers: Record<
  NutritionActivityLevelValue,
  number
> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.4655,
  active: 1.55,
  very_active: 1.725,
  extra_active: 1.91,
}

export const goalCalorieAdjustments: Record<NutritionGoalValue, number> = {
  maintain: 0,
  mild_loss: -250,
  moderate_loss: -500,
  mild_gain: 250,
  moderate_gain: 500,
}

export type MacroRatio = {
  proteinPercent: number
  carbsPercent: number
  fatPercent: number
}

export type MacroGrams = {
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
}

export type TdeeInput = {
  age: number
  sex: NutritionSexValue
  heightInches: number
  weightLbs: number
  activityLevel: NutritionActivityLevelValue
  goal: NutritionGoalValue
  macros?: MacroRatio
}

export type TdeeResult = {
  bmr: number
  tdee: number
  targetCalories: number
  proteinPercent: number
  carbsPercent: number
  fatPercent: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
}

function lbsToKg(lbs: number) {
  return lbs * 0.45359237
}

function inchesToCm(inches: number) {
  return inches * 2.54
}

/** Mifflin–St Jeor BMR from imperial inputs. */
export function calculateBmr(
  age: number,
  sex: NutritionSexValue,
  heightInches: number,
  weightLbs: number
) {
  const kg = lbsToKg(weightLbs)
  const cm = inchesToCm(heightInches)
  const base = 10 * kg + 6.25 * cm - 5 * age

  return sex === "male" ? base + 5 : base - 161
}

export function defaultMacroRatioForGoal(goal: NutritionGoalValue): MacroRatio {
  if (goal === "mild_loss" || goal === "moderate_loss") {
    return { proteinPercent: 40, carbsPercent: 30, fatPercent: 30 }
  }

  return { proteinPercent: 30, carbsPercent: 40, fatPercent: 30 }
}

export function calculateMacroGrams(
  targetCalories: number,
  ratio: MacroRatio
): MacroGrams {
  return {
    proteinGrams: Math.round((targetCalories * ratio.proteinPercent) / 100 / 4),
    carbsGrams: Math.round((targetCalories * ratio.carbsPercent) / 100 / 4),
    fatGrams: Math.round((targetCalories * ratio.fatPercent) / 100 / 9),
  }
}

export function calculateTdee(input: TdeeInput): TdeeResult {
  const bmr = calculateBmr(
    input.age,
    input.sex,
    input.heightInches,
    input.weightLbs
  )
  const tdee = bmr * activityLevelMultipliers[input.activityLevel]
  const targetCalories = Math.max(
    0,
    tdee + goalCalorieAdjustments[input.goal]
  )
  const ratio = input.macros ?? defaultMacroRatioForGoal(input.goal)
  const grams = calculateMacroGrams(targetCalories, ratio)

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories: Math.round(targetCalories),
    proteinPercent: ratio.proteinPercent,
    carbsPercent: ratio.carbsPercent,
    fatPercent: ratio.fatPercent,
    ...grams,
  }
}
