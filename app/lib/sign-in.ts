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

export const googleSignInErrorMessages = {
  google_denied: "Google sign in was cancelled.",
  google_invalid: "Google sign in failed. Please try again.",
  google_invalid_state: "Your Google sign in session expired. Please try again.",
  google_failed: "We could not complete Google sign in. Please try again.",
  account_not_found:
    "No Fitizen account matches this Google sign in. You need an invite link from your coach or administrator.",
  invite_invalid: "This invite link is invalid, expired, or has already been used.",
  invite_email_mismatch:
    "This invite is tied to a different email address. Sign in with the invited Google account.",
  setup_required: "Complete your profile setup before continuing.",
  pending_approval:
    "Your coach account is pending approval. Contact an administrator for access.",
} as const

export type GoogleSignInErrorCode = keyof typeof googleSignInErrorMessages

export function parseGoogleSignInError(
  value: string | null
): GoogleSignInErrorCode | null {
  if (!value) {
    return null
  }

  return value in googleSignInErrorMessages
    ? (value as GoogleSignInErrorCode)
    : null
}
