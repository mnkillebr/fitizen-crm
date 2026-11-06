import { z } from "zod"

export const SEX_VALUES = [
  "male",
  "female",
  "other",
  "prefer_not_to_say",
] as const

export type SexValue = (typeof SEX_VALUES)[number]

export const sexLabels: Record<SexValue, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
}

export const goalsSchema = z
  .array(z.string().trim().min(1, "Goal cannot be empty").max(500))
  .min(1, "Add at least one goal")
  .max(3, "You can add up to 3 goals")

export const goalsStepSchema = z.object({
  goals: goalsSchema,
})

export const memberProfileFormSchema = z
  .object({
    goals: goalsSchema,
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    age: z.coerce.number().int().min(1, "Enter a valid age").max(120),
    heightFeet: z.coerce.number().int().min(3, "Enter a valid height").max(8),
    heightInches: z.coerce
      .number()
      .min(0, "Enter a valid height")
      .max(11.9, "Inches must be less than 12"),
    weightLbs: z.coerce
      .number()
      .min(50, "Enter a valid weight")
      .max(700, "Enter a valid weight"),
    sex: z.enum(SEX_VALUES, { error: "Select an option" }),
  })
  .transform((data) => ({
    ...data,
    totalHeightInches: data.heightFeet * 12 + data.heightInches,
  }))

export type MemberProfileFormValues = z.infer<typeof memberProfileFormSchema>

export const memberDetailsFormSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    age: z.coerce.number().int().min(1, "Enter a valid age").max(120),
    heightFeet: z.coerce.number().int().min(3, "Enter a valid height").max(8),
    heightInches: z.coerce
      .number()
      .min(0, "Enter a valid height")
      .max(11.9, "Inches must be less than 12"),
    weightLbs: z.coerce
      .number()
      .min(50, "Enter a valid weight")
      .max(700, "Enter a valid weight"),
    sex: z.enum(SEX_VALUES, { error: "Select an option" }),
  })
  .transform((data) => ({
    ...data,
    totalHeightInches: data.heightFeet * 12 + data.heightInches,
  }))

export type MemberProfileFormFieldErrors = Partial<{
  goals: string
  firstName: string
  lastName: string
  age: string
  heightFeet: string
  heightInches: string
  weightLbs: string
  sex: string
}>

function readGoalsFromFormData(formData: FormData) {
  return formData
    .getAll("goals")
    .map((value) => value.toString())
    .filter((value) => value.trim().length > 0)
}

export function parseMemberProfileFormData(formData: FormData) {
  return memberProfileFormSchema.safeParse({
    goals: readGoalsFromFormData(formData),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    age: formData.get("age"),
    heightFeet: formData.get("heightFeet"),
    heightInches: formData.get("heightInches"),
    weightLbs: formData.get("weightLbs"),
    sex: formData.get("sex"),
  })
}

export function parseMemberGoalsFormData(formData: FormData) {
  return goalsStepSchema.safeParse({
    goals: readGoalsFromFormData(formData),
  })
}

export function parseMemberDetailsFormData(formData: FormData) {
  return memberDetailsFormSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    age: formData.get("age"),
    heightFeet: formData.get("heightFeet"),
    heightInches: formData.get("heightInches"),
    weightLbs: formData.get("weightLbs"),
    sex: formData.get("sex"),
  })
}

export function flattenMemberProfileFieldErrors(
  error: z.ZodError
): MemberProfileFormFieldErrors {
  const fieldErrors = error.flatten().fieldErrors as Partial<
    Record<keyof MemberProfileFormFieldErrors, string[]>
  >
  return {
    goals: fieldErrors.goals?.[0],
    firstName: fieldErrors.firstName?.[0],
    lastName: fieldErrors.lastName?.[0],
    age: fieldErrors.age?.[0],
    heightFeet: fieldErrors.heightFeet?.[0],
    heightInches: fieldErrors.heightInches?.[0],
    weightLbs: fieldErrors.weightLbs?.[0],
    sex: fieldErrors.sex?.[0],
  }
}

/** Split total inches into feet + remainder inches for form defaults. */
export function splitHeightInches(totalInches: number): {
  heightFeet: number
  heightInches: number
} {
  const rounded = Math.round(totalInches * 10) / 10
  const heightFeet = Math.floor(rounded / 12)
  const heightInches = Math.round((rounded - heightFeet * 12) * 10) / 10
  return { heightFeet, heightInches }
}
