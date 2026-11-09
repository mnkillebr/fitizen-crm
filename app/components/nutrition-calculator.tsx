import { useState } from "react"
import { Form } from "react-router"

import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Checkbox } from "~/components/ui/checkbox"
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
  nutritionActivityLevelLabels,
  nutritionGoalLabels,
  nutritionSexLabels,
  splitHeightInches,
  type NutritionFormFieldErrors,
} from "~/lib/nutrition-form"
import {
  nutritionActivityLevelValues,
  nutritionGoalValues,
  nutritionSexValues,
  type NutritionActivityLevelValue,
  type NutritionGoalValue,
  type NutritionSexValue,
} from "~/lib/tdee"
import type {
  MemberNutritionTargetSelect,
  NutritionPrefill,
} from "../../models/nutrition.server"

type NutritionCalculatorProps = {
  target: MemberNutritionTargetSelect | null
  prefill: NutritionPrefill
  fieldErrors?: NutritionFormFieldErrors
  isSubmitting?: boolean
}

function defaultsFrom(
  target: MemberNutritionTargetSelect | null,
  prefill: NutritionPrefill
) {
  const heightSource = target?.heightInches ?? prefill.heightInches
  const height = heightSource != null ? splitHeightInches(heightSource) : null

  return {
    age: target?.age ?? prefill.age ?? undefined,
    sex: (target?.sex ?? prefill.sex ?? undefined) as
      | NutritionSexValue
      | undefined,
    heightFeet: height?.heightFeet,
    heightInches: height?.heightInches,
    weightLbs: target?.weightLbs ?? prefill.weightLbs ?? undefined,
    activityLevel: (target?.activityLevel ?? undefined) as
      | NutritionActivityLevelValue
      | undefined,
    goal: (target?.goal ?? undefined) as NutritionGoalValue | undefined,
    proteinPercent: target?.proteinPercent ?? 30,
    carbsPercent: target?.carbsPercent ?? 40,
    fatPercent: target?.fatPercent ?? 30,
  }
}

export function NutritionCalculator({
  target,
  prefill,
  fieldErrors,
  isSubmitting = false,
}: NutritionCalculatorProps) {
  const defaults = defaultsFrom(target, prefill)
  const [editing, setEditing] = useState(!target)
  const [sex, setSex] = useState<NutritionSexValue | undefined>(defaults.sex)
  const [activityLevel, setActivityLevel] = useState<
    NutritionActivityLevelValue | undefined
  >(defaults.activityLevel)
  const [goal, setGoal] = useState<NutritionGoalValue | undefined>(defaults.goal)
  const [useCustomMacros, setUseCustomMacros] = useState(false)

  if (target && !editing) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Energy targets</CardTitle>
                <CardDescription>
                  Saved Mifflin–St Jeor estimate based on your last calculation.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                Recalculate
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-md border p-4">
              <p className="text-xs text-muted-foreground">BMR</p>
              <p className="mt-1 text-2xl font-semibold">
                {Math.round(target.bmr).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">kcal / day</p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-xs text-muted-foreground">TDEE</p>
              <p className="mt-1 text-2xl font-semibold">
                {Math.round(target.tdee).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">kcal / day</p>
            </div>
            <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
              <p className="text-xs text-muted-foreground">Target calories</p>
              <p className="mt-1 text-2xl font-semibold">
                {Math.round(target.targetCalories).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {nutritionGoalLabels[target.goal as NutritionGoalValue]}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Macro nutrient targets</CardTitle>
            <CardDescription>
              Daily protein, carbohydrate, and fat targets for your calorie goal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {target.proteinPercent}% protein
              </Badge>
              <Badge variant="secondary">{target.carbsPercent}% carbs</Badge>
              <Badge variant="secondary">{target.fatPercent}% fat</Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">Protein</p>
                <p className="mt-1 text-2xl font-semibold">
                  {target.proteinGrams}g
                </p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">Carbs</p>
                <p className="mt-1 text-2xl font-semibold">
                  {target.carbsGrams}g
                </p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">Fat</p>
                <p className="mt-1 text-2xl font-semibold">{target.fatGrams}g</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Based on {nutritionActivityLevelLabels[target.activityLevel as NutritionActivityLevelValue]}{" "}
              activity · updated{" "}
              {new Date(target.updatedAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">
              {target ? "Recalculate TDEE" : "Calculate TDEE"}
            </CardTitle>
            <CardDescription>
              Uses the Mifflin–St Jeor equation with your activity level and goal.
            </CardDescription>
          </div>
          {target ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <Form method="post" className="space-y-6">
          {fieldErrors?.formError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {fieldErrors.formError}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nutrition-age">Age</Label>
              <Input
                id="nutrition-age"
                name="age"
                type="number"
                min={1}
                max={120}
                defaultValue={defaults.age ?? ""}
                required
                aria-invalid={fieldErrors?.age ? true : undefined}
              />
              {fieldErrors?.age ? (
                <p className="text-xs text-destructive">{fieldErrors.age}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nutrition-sex">Sex</Label>
              <Select
                name="sex"
                value={sex}
                onValueChange={(value) =>
                  setSex(value as NutritionSexValue | undefined)
                }
                required
              >
                <SelectTrigger
                  id="nutrition-sex"
                  className="w-full"
                  aria-invalid={fieldErrors?.sex ? true : undefined}
                >
                  <SelectValue placeholder="Select male or female" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Sex</SelectLabel>
                    {nutritionSexValues.map((value) => (
                      <SelectItem key={value} value={value}>
                        {nutritionSexLabels[value]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldErrors?.sex ? (
                <p className="text-xs text-destructive">{fieldErrors.sex}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="nutrition-height-feet">Height (ft)</Label>
              <Input
                id="nutrition-height-feet"
                name="heightFeet"
                type="number"
                min={3}
                max={8}
                defaultValue={defaults.heightFeet ?? ""}
                required
                aria-invalid={fieldErrors?.heightFeet ? true : undefined}
              />
              {fieldErrors?.heightFeet ? (
                <p className="text-xs text-destructive">
                  {fieldErrors.heightFeet}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nutrition-height-inches">Height (in)</Label>
              <Input
                id="nutrition-height-inches"
                name="heightInches"
                type="number"
                min={0}
                max={11.9}
                step="0.1"
                defaultValue={defaults.heightInches ?? ""}
                required
                aria-invalid={fieldErrors?.heightInches ? true : undefined}
              />
              {fieldErrors?.heightInches ? (
                <p className="text-xs text-destructive">
                  {fieldErrors.heightInches}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nutrition-weight">Weight (lbs)</Label>
              <Input
                id="nutrition-weight"
                name="weightLbs"
                type="number"
                min={50}
                max={700}
                step="0.1"
                defaultValue={defaults.weightLbs ?? ""}
                required
                aria-invalid={fieldErrors?.weightLbs ? true : undefined}
              />
              {fieldErrors?.weightLbs ? (
                <p className="text-xs text-destructive">
                  {fieldErrors.weightLbs}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nutrition-activity">Activity level</Label>
              <Select
                name="activityLevel"
                value={activityLevel}
                onValueChange={(value) =>
                  setActivityLevel(
                    value as NutritionActivityLevelValue | undefined
                  )
                }
                required
              >
                <SelectTrigger
                  id="nutrition-activity"
                  className="w-full"
                  aria-invalid={fieldErrors?.activityLevel ? true : undefined}
                >
                  <SelectValue placeholder="Select activity level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Activity level</SelectLabel>
                    {nutritionActivityLevelValues.map((value) => (
                      <SelectItem key={value} value={value}>
                        {nutritionActivityLevelLabels[value]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldErrors?.activityLevel ? (
                <p className="text-xs text-destructive">
                  {fieldErrors.activityLevel}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nutrition-goal">Goal</Label>
              <Select
                name="goal"
                value={goal}
                onValueChange={(value) =>
                  setGoal(value as NutritionGoalValue | undefined)
                }
                required
              >
                <SelectTrigger
                  id="nutrition-goal"
                  className="w-full"
                  aria-invalid={fieldErrors?.goal ? true : undefined}
                >
                  <SelectValue placeholder="Select a goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Goal</SelectLabel>
                    {nutritionGoalValues.map((value) => (
                      <SelectItem key={value} value={value}>
                        {nutritionGoalLabels[value]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldErrors?.goal ? (
                <p className="text-xs text-destructive">{fieldErrors.goal}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col">
            <p className="text-xs text-muted-foreground">
              <b>Exercise:</b> 15-30 minutes of elevated heart rate activity.
            </p>
            <p className="text-xs text-muted-foreground">
              <b>Intense exercise:</b> 45-120 minutes of elevated heart rate activity.
            </p>
            <p className="text-xs text-muted-foreground">
              <b>Very intense exercise:</b> 120+ minutes of elevated heart rate activity.
            </p>
          </div>
          
          <div className="space-y-3 rounded-md border p-4">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                name="useCustomMacros"
                className="size-4 rounded border border-input"
                checked={useCustomMacros}
                onCheckedChange={(checked) => setUseCustomMacros(checked as boolean)}
              />
              Use custom macro ratios
            </Label>
            <p className="text-xs text-muted-foreground">
              Default maintain/gain is 30/40/30. Default weight loss is 40/30/30.
            </p>

            {useCustomMacros ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="nutrition-protein-pct">Protein %</Label>
                  <Input
                    id="nutrition-protein-pct"
                    name="proteinPercent"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={defaults.proteinPercent}
                    required
                    aria-invalid={
                      fieldErrors?.proteinPercent ? true : undefined
                    }
                  />
                  {fieldErrors?.proteinPercent ? (
                    <p className="text-xs text-destructive">
                      {fieldErrors.proteinPercent}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nutrition-carbs-pct">Carbs %</Label>
                  <Input
                    id="nutrition-carbs-pct"
                    name="carbsPercent"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={defaults.carbsPercent}
                    required
                    aria-invalid={fieldErrors?.carbsPercent ? true : undefined}
                  />
                  {fieldErrors?.carbsPercent ? (
                    <p className="text-xs text-destructive">
                      {fieldErrors.carbsPercent}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nutrition-fat-pct">Fat %</Label>
                  <Input
                    id="nutrition-fat-pct"
                    name="fatPercent"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={defaults.fatPercent}
                    required
                    aria-invalid={fieldErrors?.fatPercent ? true : undefined}
                  />
                  {fieldErrors?.fatPercent ? (
                    <p className="text-xs text-destructive">
                      {fieldErrors.fatPercent}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save nutrition targets"}
          </Button>
        </Form>
      </CardContent>
    </Card>
  )
}
