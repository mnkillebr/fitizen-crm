import { z } from "zod"

const requiredNumber = (label: string, min: number, max: number) =>
  z.coerce
    .number({ error: `${label} is required` })
    .min(min, `${label} must be at least ${min}`)
    .max(max, `${label} must be at most ${max}`)

export const inBodyFormSchema = z.object({
  scannedAt: z
    .string()
    .trim()
    .min(1, "Scan date is required")
    .refine((value) => !Number.isNaN(new Date(`${value}T12:00:00`).getTime()), {
      message: "Enter a valid scan date",
    }),
  weightLbs: requiredNumber("Weight", 50, 700),
  skeletalMuscleMassLbs: requiredNumber("Skeletal muscle mass", 20, 400),
  percentBodyFat: requiredNumber("Percent body fat", 1, 70),
  ecwRatio: requiredNumber("ECW ratio", 0.2, 0.5),
  basalMetabolicRate: requiredNumber("Basal metabolic rate", 500, 5000),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes must be 2000 characters or fewer")
    .optional()
    .transform((value) => (value ? value : undefined)),
})

export type InBodyFormValues = z.infer<typeof inBodyFormSchema>

export type InBodyFormFieldErrors = Partial<
  Record<keyof InBodyFormValues, string | undefined>
>

export function parseInBodyFormData(formData: FormData) {
  return inBodyFormSchema.safeParse({
    scannedAt: formData.get("scannedAt")?.toString() ?? "",
    weightLbs: formData.get("weightLbs")?.toString() ?? "",
    skeletalMuscleMassLbs: formData.get("skeletalMuscleMassLbs")?.toString() ?? "",
    percentBodyFat: formData.get("percentBodyFat")?.toString() ?? "",
    ecwRatio: formData.get("ecwRatio")?.toString() ?? "",
    basalMetabolicRate: formData.get("basalMetabolicRate")?.toString() ?? "",
    notes: formData.get("notes")?.toString() ?? "",
  })
}

export function getInBodyFormFieldErrors(
  error: z.ZodError<InBodyFormValues>
): InBodyFormFieldErrors {
  const fieldErrors = error.flatten().fieldErrors

  return {
    scannedAt: fieldErrors.scannedAt?.[0],
    weightLbs: fieldErrors.weightLbs?.[0],
    skeletalMuscleMassLbs: fieldErrors.skeletalMuscleMassLbs?.[0],
    percentBodyFat: fieldErrors.percentBodyFat?.[0],
    ecwRatio: fieldErrors.ecwRatio?.[0],
    basalMetabolicRate: fieldErrors.basalMetabolicRate?.[0],
    notes: fieldErrors.notes?.[0],
  }
}

export function scannedAtToDate(scannedAt: string) {
  return new Date(`${scannedAt}T12:00:00`)
}

export function formatScannedAtInput(value: Date | string) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
