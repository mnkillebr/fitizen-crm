import type { GoogleUserProfile } from "~/lib/google-oauth.server";
import db from "../db";
import { User, GoogleProfile, CoachMember } from "../db/schema";
import { eq, and } from "drizzle-orm";

export function getUserByEmail(email: string) {
  return db.select().from(User).where(eq(User.email, email));
};

export function getUserById(id: string) {
  return db.select().from(User).where(eq(User.id, id));
};

// export function getUserByProfileId(email: string, profileId: string) {
//   return db.select()
//     .from(User)
//     .where(and(eq(User.email, email), eq(User.profileId, profileId)));
// }

export function createUser(user: typeof User.$inferInsert) {
  return db.insert(User).values(user).returning();
}

interface GoogleProfileInsert extends Omit<GoogleUserProfile, 'id'> {
  userId?: string;
  profileId: string;
}

export function createGoogleProfile(googleProfile: GoogleProfileInsert) {
  return db.insert(GoogleProfile).values(googleProfile).returning();
}

export async function createUserWithGoogleProfile(user: typeof User.$inferInsert, googleProfile: GoogleProfileInsert) {
  // Create the user
  const newUserData = await createUser(user);
  const newUser = newUserData[0];
  const newUserId = newUser.id;

  // Create the google profile
  let googleProfileWithUserId = {
    ...googleProfile,
    userId: newUserId,
  }
  const newGoogleProfileData = await createGoogleProfile(googleProfileWithUserId);
  const newGoogleProfile = newGoogleProfileData[0];

  // Return the user and google profile
  return { user: newUser, googleProfile: newGoogleProfile };
}

export function appendGoogleProfileToUser(googleProfileWithUserId: GoogleProfileInsert) {
  // Create the google profile with associated user id
  return createGoogleProfile(googleProfileWithUserId);
}

export function linkMemberToCoach(coachId: string, memberId: string) {
  return db.insert(CoachMember).values({ coachId, memberId }).returning();
}

export function getUserWithEmailAndProfileId(email: string, profileId: string) {
  return db.select({
    id: User.id,
    role: User.role,
  })
    .from(User)
    .leftJoin(GoogleProfile, eq(User.id, GoogleProfile.userId))
    .where(and(eq(User.email, email), eq(GoogleProfile.profileId, profileId)));
}