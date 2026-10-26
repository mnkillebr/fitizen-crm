import type { GoogleUserProfile } from "~/lib/google-oauth.server"
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
