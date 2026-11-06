import { and, asc, eq } from "drizzle-orm"

import type { GoogleUserProfile } from "~/lib/google-oauth.server"
import type { SexValue } from "~/lib/member-profile-form"
import db from "../db"
import {
  CoachMember,
  FitnessGoal,
  GoogleProfile,
  MemberProfile,
  User,
} from "../db/schema"

type GoogleProfileInsert = Omit<GoogleUserProfile, "id"> & {
  userId?: string
  profileId: string
}

export type MemberProfileInsert = {
  sex: (typeof MemberProfile.$inferInsert)["sex"]
  heightInches: number
  weightLbs: number
}

export type FitnessGoalRow = {
  id: string
  statement: string
  orderIndex: number
}

export type MemberProfileBundle = {
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    age: number | null
  }
  profile: {
    sex: SexValue
    heightInches: number
    weightLbs: number
  } | null
  goals: FitnessGoalRow[]
}

export async function createMemberOnboarding(input: {
  user: typeof User.$inferInsert
  googleProfile: GoogleProfileInsert
  profile: MemberProfileInsert
  goals: string[]
  coachId: string | null
}) {
  const now = new Date()

  return db.transaction(async (tx) => {
    const [user] = await tx.insert(User).values(input.user).returning()

    const [googleProfile] = await tx
      .insert(GoogleProfile)
      .values({
        ...input.googleProfile,
        userId: user.id,
      })
      .returning()

    const [memberProfile] = await tx
      .insert(MemberProfile)
      .values({
        userId: user.id,
        sex: input.profile.sex,
        heightInches: input.profile.heightInches,
        weightLbs: input.profile.weightLbs,
        updatedAt: now,
      })
      .returning()

    const fitnessGoals =
      input.goals.length > 0
        ? await tx
            .insert(FitnessGoal)
            .values(
              input.goals.map((statement, orderIndex) => ({
                userId: user.id,
                statement,
                orderIndex,
                updatedAt: now,
              }))
            )
            .returning()
        : []

    if (input.coachId) {
      await tx.insert(CoachMember).values({
        coachId: input.coachId,
        memberId: user.id,
      })
    }

    return { user, googleProfile, memberProfile, fitnessGoals }
  })
}

export async function getMemberProfileBundle(
  userId: string
): Promise<MemberProfileBundle | null> {
  const users = await db.select().from(User).where(eq(User.id, userId))
  const user = users[0]

  if (!user || user.role !== "member") {
    return null
  }

  const [profiles, goals] = await Promise.all([
    db.select().from(MemberProfile).where(eq(MemberProfile.userId, userId)),
    db
      .select({
        id: FitnessGoal.id,
        statement: FitnessGoal.statement,
        orderIndex: FitnessGoal.orderIndex,
      })
      .from(FitnessGoal)
      .where(eq(FitnessGoal.userId, userId))
      .orderBy(asc(FitnessGoal.orderIndex)),
  ])

  const profile = profiles[0]

  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      age: user.age,
    },
    profile: profile
      ? {
          sex: profile.sex,
          heightInches: profile.heightInches,
          weightLbs: profile.weightLbs,
        }
      : null,
    goals,
  }
}

export async function getMemberGoalsForCoach(
  coachId: string,
  memberId: string
): Promise<FitnessGoalRow[] | null> {
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

  return db
    .select({
      id: FitnessGoal.id,
      statement: FitnessGoal.statement,
      orderIndex: FitnessGoal.orderIndex,
    })
    .from(FitnessGoal)
    .where(eq(FitnessGoal.userId, memberId))
    .orderBy(asc(FitnessGoal.orderIndex))
}

export async function updateMemberGoals(userId: string, goals: string[]) {
  const now = new Date()

  return db.transaction(async (tx) => {
    await tx.delete(FitnessGoal).where(eq(FitnessGoal.userId, userId))

    if (goals.length === 0) {
      return []
    }

    return tx
      .insert(FitnessGoal)
      .values(
        goals.map((statement, orderIndex) => ({
          userId,
          statement,
          orderIndex,
          updatedAt: now,
        }))
      )
      .returning()
  })
}

export async function updateMemberRegistrationDetails(
  userId: string,
  input: {
    firstName: string
    lastName: string
    age: number
    sex: SexValue
    heightInches: number
    weightLbs: number
  }
) {
  const now = new Date()

  return db.transaction(async (tx) => {
    const [user] = await tx
      .update(User)
      .set({
        firstName: input.firstName,
        lastName: input.lastName,
        age: input.age,
        updatedAt: now,
      })
      .where(eq(User.id, userId))
      .returning()

    if (!user) {
      return null
    }

    const existingProfiles = await tx
      .select({ id: MemberProfile.id })
      .from(MemberProfile)
      .where(eq(MemberProfile.userId, userId))
      .limit(1)

    if (existingProfiles[0]) {
      await tx
        .update(MemberProfile)
        .set({
          sex: input.sex,
          heightInches: input.heightInches,
          weightLbs: input.weightLbs,
          updatedAt: now,
        })
        .where(eq(MemberProfile.userId, userId))
    } else {
      await tx.insert(MemberProfile).values({
        userId,
        sex: input.sex,
        heightInches: input.heightInches,
        weightLbs: input.weightLbs,
        updatedAt: now,
      })
    }

    return { user }
  })
}
