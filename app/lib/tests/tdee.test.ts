import { describe, expect, it } from "vitest"

import {
  calculateBmr,
  calculateMacroGrams,
  calculateTdee,
  defaultMacroRatioForGoal,
} from "~/lib/tdee"

describe("tdee", () => {
  it("calculates Mifflin–St Jeor BMR for male and female", () => {
    // 30y, 70in, 180lb
    const male = calculateBmr(30, "male", 70, 180)
    const female = calculateBmr(30, "female", 70, 180)

    expect(male - female).toBe(166)
    expect(Math.round(male)).toBeGreaterThan(1700)
    expect(Math.round(female)).toBeLessThan(Math.round(male))
  })

  it("applies activity and goal adjustments", () => {
    const result = calculateTdee({
      age: 30,
      sex: "male",
      heightInches: 70,
      weightLbs: 180,
      activityLevel: "moderate",
      goal: "mild_loss",
    })

    const rawBmr = calculateBmr(30, "male", 70, 180)
    expect(result.bmr).toBe(Math.round(rawBmr))
    expect(result.tdee).toBe(Math.round(rawBmr * 1.55))
    expect(result.targetCalories).toBe(result.tdee - 250)
    expect(result.proteinPercent).toBe(40)
    expect(result.carbsPercent).toBe(30)
    expect(result.fatPercent).toBe(30)
  })

  it("uses maintain/gain macro defaults and custom ratios", () => {
    expect(defaultMacroRatioForGoal("maintain")).toEqual({
      proteinPercent: 30,
      carbsPercent: 40,
      fatPercent: 30,
    })

    const grams = calculateMacroGrams(2000, {
      proteinPercent: 30,
      carbsPercent: 40,
      fatPercent: 30,
    })

    expect(grams).toEqual({
      proteinGrams: 150,
      carbsGrams: 200,
      fatGrams: 67,
    })

    const custom = calculateTdee({
      age: 30,
      sex: "female",
      heightInches: 65,
      weightLbs: 140,
      activityLevel: "sedentary",
      goal: "maintain",
      macros: { proteinPercent: 25, carbsPercent: 45, fatPercent: 30 },
    })

    expect(custom.proteinPercent).toBe(25)
    expect(custom.carbsPercent).toBe(45)
    expect(custom.fatPercent).toBe(30)
  })
})
