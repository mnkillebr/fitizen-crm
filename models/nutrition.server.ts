import { and, eq } from "drizzle-orm"

import db from "../db"
import {
  CoachMember,
  MemberNutritionTarget,
  MemberProfile,
  User,
} from "../db/schema"
import type {
  NutritionActivityLevelValue,
  NutritionGoalValue,
  NutritionSexValue,
  TdeeResult,
} from "../app/lib/tdee"

export type MemberNutritionTargetSelect =
  typeof MemberNutritionTarget.$inferSelect

export type NutritionPrefill = {
  age: number | null
  sex: NutritionSexValue | null
  heightInches: number | null
  weightLbs: number | null
}

export type CoachClientNutritionContext = {
  client: {
    id: string
    name: string
  }
  prefill: NutritionPrefill
  target: MemberNutritionTargetSelect | null
}

export type UpsertNutritionTargetInput = {
  age: number
  sex: NutritionSexValue
  heightInches: number
  weightLbs: number
  activityLevel: NutritionActivityLevelValue
  goal: NutritionGoalValue
} & TdeeResult

export function getMemberNutritionTarget(userId: string) {
  return db
    .select()
    .from(MemberNutritionTarget)
    .where(eq(MemberNutritionTarget.userId, userId))
    .then((rows) => rows[0] ?? null)
}

export async function getMemberNutritionPrefill(
  userId: string
): Promise<NutritionPrefill | null> {
  const users = await db.select().from(User).where(eq(User.id, userId))
  const user = users[0]

  if (!user || user.role !== "member") {
    return null
  }

  const profiles = await db
    .select()
    .from(MemberProfile)
    .where(eq(MemberProfile.userId, userId))
  const profile = profiles[0]

  const sex =
    profile?.sex === "male" || profile?.sex === "female" ? profile.sex : null

  return {
    age: user.age ?? null,
    sex,
    heightInches: profile?.heightInches ?? null,
    weightLbs: profile?.weightLbs ?? null,
  }
}

export async function upsertMemberNutritionTarget(
  userId: string,
  input: UpsertNutritionTargetInput
) {
  const now = new Date()
  const existing = await getMemberNutritionTarget(userId)

  if (existing) {
    const [updated] = await db
      .update(MemberNutritionTarget)
      .set({
        ...input,
        updatedAt: now,
      })
      .where(eq(MemberNutritionTarget.userId, userId))
      .returning()

    return updated
  }

  const [created] = await db
    .insert(MemberNutritionTarget)
    .values({
      userId,
      ...input,
      updatedAt: now,
    })
    .returning()

  return created
}

export async function getCoachClientNutritionContext(
  coachId: string,
  memberId: string
): Promise<CoachClientNutritionContext | null> {
  const links = await db
    .select({ id: CoachMember.id })
    .from(CoachMember)
    .where(
      and(eq(CoachMember.coachId, coachId), eq(CoachMember.memberId, memberId))
    )
    .limit(1)

  if (!links[0]) {
    return null
  }

  const users = await db.select().from(User).where(eq(User.id, memberId))
  const user = users[0]

  if (!user || user.role !== "member") {
    return null
  }

  const [profiles, target] = await Promise.all([
    db.select().from(MemberProfile).where(eq(MemberProfile.userId, memberId)),
    getMemberNutritionTarget(memberId),
  ])
  const profile = profiles[0]
  const sex =
    profile?.sex === "male" || profile?.sex === "female" ? profile.sex : null

  return {
    client: {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
    },
    prefill: {
      age: user.age ?? null,
      sex,
      heightInches: profile?.heightInches ?? null,
      weightLbs: profile?.weightLbs ?? null,
    },
    target,
  }
}
