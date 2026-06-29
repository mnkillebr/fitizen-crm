import { randomBytes } from "node:crypto"

import { and, desc, eq, gt, isNull } from "drizzle-orm"

import db from "../db"
import { Invite, SignInAttempt } from "../db/schema"
import type { SignInRole } from "~/lib/sign-in"

export type SignInAttemptOutcomeValue =
  | "no_invite"
  | "invalid_invite"
  | "email_mismatch"
  | "invite_expired"
  | "invite_used"

export type InviteValidationResult =
  | { valid: true; invite: typeof Invite.$inferSelect }
  | { valid: false; outcome: SignInAttemptOutcomeValue }

const DEFAULT_COACH_INVITE_DAYS = 7
const DEFAULT_MEMBER_INVITE_DAYS = 14

function generateInviteToken(): string {
  return randomBytes(32).toString("base64url")
}

function getDefaultExpiry(role: SignInRole): Date {
  const days =
    role === "coach" ? DEFAULT_COACH_INVITE_DAYS : DEFAULT_MEMBER_INVITE_DAYS
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + days)
  return expiresAt
}

export function createInvite(input: {
  role: SignInRole
  createdById: string
  coachId?: string | null
  email?: string | null
  expiresAt?: Date
}) {
  const token = generateInviteToken()
  const expiresAt = input.expiresAt ?? getDefaultExpiry(input.role)

  return db
    .insert(Invite)
    .values({
      token,
      role: input.role,
      email: input.email ?? null,
      createdById: input.createdById,
      coachId: input.coachId ?? null,
      expiresAt,
    })
    .returning()
}

export function getInviteByToken(token: string) {
  return db.select().from(Invite).where(eq(Invite.token, token))
}

export function getInviteById(id: string) {
  return db.select().from(Invite).where(eq(Invite.id, id))
}

export function getInvitesByCoach(coachId: string) {
  return db
    .select()
    .from(Invite)
    .where(and(eq(Invite.createdById, coachId), eq(Invite.role, "member")))
    .orderBy(desc(Invite.createdAt))
}

export function validateInvite(
  invite: typeof Invite.$inferSelect | undefined,
  options?: { email?: string }
): InviteValidationResult {
  if (!invite) {
    return { valid: false, outcome: "invalid_invite" }
  }

  if (invite.usedAt) {
    return { valid: false, outcome: "invite_used" }
  }

  if (invite.expiresAt < new Date()) {
    return { valid: false, outcome: "invite_expired" }
  }

  if (options?.email && invite.email && invite.email !== options.email) {
    return { valid: false, outcome: "email_mismatch" }
  }

  return { valid: true, invite }
}

export async function validateInviteByToken(
  token: string,
  options?: { email?: string }
): Promise<InviteValidationResult> {
  const invites = await getInviteByToken(token)
  return validateInvite(invites[0], options)
}

export async function validateInviteById(
  id: string,
  options?: { email?: string }
): Promise<InviteValidationResult> {
  const invites = await getInviteById(id)
  return validateInvite(invites[0], options)
}

export function redeemInvite(inviteId: string, usedByUserId: string) {
  return db
    .update(Invite)
    .set({
      usedAt: new Date(),
      usedByUserId,
    })
    .where(
      and(
        eq(Invite.id, inviteId),
        isNull(Invite.usedAt),
        gt(Invite.expiresAt, new Date())
      )
    )
    .returning()
}

export function logSignInAttempt(input: {
  email: string
  googleProfileId: string
  attemptedRole: SignInRole
  inviteToken?: string | null
  outcome: SignInAttemptOutcomeValue
}) {
  return db.insert(SignInAttempt).values({
    email: input.email,
    googleProfileId: input.googleProfileId,
    attemptedRole: input.attemptedRole,
    inviteToken: input.inviteToken ?? null,
    outcome: input.outcome,
  })
}

export function getActiveInviteById(id: string) {
  return db
    .select()
    .from(Invite)
    .where(
      and(
        eq(Invite.id, id),
        isNull(Invite.usedAt),
        gt(Invite.expiresAt, new Date())
      )
    )
}
