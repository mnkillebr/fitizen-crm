import { boolean, integer, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';

export const Role = pgEnum('Role', ['coach', 'member'])

export const User = pgTable('User', {
	id: uuid('id').primaryKey().defaultRandom(),
	firstName: text('firstName').notNull(),
	lastName: text('lastName').notNull(),
  age: integer(),
  email: varchar('email', { length: 255 }).notNull().unique(),
	createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
	updatedAt: timestamp('updatedAt', { precision: 3 }).notNull(),
	role: Role('role').notNull(),
  approvedCoach: boolean('approved').notNull().default(false),
  admin: boolean('admin').notNull().default(false),
});

export const GoogleProfile = pgTable('GoogleProfile', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('userId').references(() => User.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  profileId: varchar('profileId').notNull().unique(), 
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: text('name').notNull(),
  picture: text('picture').notNull(),
  verifiedEmail: boolean('verifiedEmail').notNull().default(false),
});

export const UserProfileRelations = relations(User, ({ one }) => ({
  googleProfile: one(GoogleProfile, {
    fields: [User.id],
    references: [GoogleProfile.userId],
  }),
}));

export const GoogleProfileRelations = relations(GoogleProfile, ({ one }) => ({
  user: one(User, {
    fields: [GoogleProfile.userId],
    references: [User.id],
  }),
}));
