import db from "../db";
import { User } from "../db/schema";
import { eq, and } from "drizzle-orm";

export function getUserByEmail(email: string) {
  return db.select().from(User).where(eq(User.email, email));
};

export function getUserById(id: string) {
  return db.select().from(User).where(eq(User.id, id));
};

export function getUserByProfileId(email: string, profileId: string) {
  return db.select()
    .from(User)
    .where(and(eq(User.email, email), eq(User.profileId, profileId)));
}
