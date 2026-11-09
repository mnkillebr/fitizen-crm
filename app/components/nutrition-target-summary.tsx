type NutritionTargetSummaryProps = {
  target: {
    targetCalories: number
    proteinGrams: number
    carbsGrams: number
    fatGrams: number
    proteinPercent: number
    carbsPercent: number
    fatPercent: number
  } | null
  emptyCta?: string
  filledCta?: string
}

export function NutritionTargetSummary({
  target,
  emptyCta = "Open nutrition",
  filledCta = "View nutrition",
}: NutritionTargetSummaryProps) {
  if (!target) {
    return <p className="text-xs font-medium text-primary">{emptyCta}</p>
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-muted-foreground">Target calories</p>
        <p className="text-lg font-semibold tabular-nums">
          {Math.round(target.targetCalories).toLocaleString()}
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            kcal
          </span>
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md border bg-background/60 px-2 py-2 text-center">
          <p className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">
            Protein
          </p>
          <p className="text-sm font-semibold tabular-nums">
            {target.proteinGrams}g
          </p>
          <p className="text-[0.625rem] text-muted-foreground">
            {target.proteinPercent}%
          </p>
        </div>
        <div className="rounded-md border bg-background/60 px-2 py-2 text-center">
          <p className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">
            Carbs
          </p>
          <p className="text-sm font-semibold tabular-nums">
            {target.carbsGrams}g
          </p>
          <p className="text-[0.625rem] text-muted-foreground">
            {target.carbsPercent}%
          </p>
        </div>
        <div className="rounded-md border bg-background/60 px-2 py-2 text-center">
          <p className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">
            Fat
          </p>
          <p className="text-sm font-semibold tabular-nums">{target.fatGrams}g</p>
          <p className="text-[0.625rem] text-muted-foreground">
            {target.fatPercent}%
          </p>
        </div>
      </div>
      <p className="text-xs font-medium text-primary">{filledCta}</p>
    </div>
  )
}
