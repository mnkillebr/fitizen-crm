import { z } from "zod"

export const signInRoleSchema = z.enum(["coach", "member"])

export type SignInRole = z.infer<typeof signInRoleSchema>

export const emailSignInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .pipe(z.email("Enter a valid email address")),
  role: signInRoleSchema,
})

export type EmailSignInInput = z.infer<typeof emailSignInSchema>

export function parseSignInRole(value: string | null): SignInRole {
  const result = signInRoleSchema.safeParse(value)
  return result.success ? result.data : "coach"
}

export const signInRoleLabels: Record<SignInRole, string> = {
  coach: "Coach",
  member: "Member",
}
