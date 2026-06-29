import { boolean, integer, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';

export const Role = pgEnum('Role', ['coach', 'member'])

export const SignInAttemptOutcome = pgEnum('SignInAttemptOutcome', [
  'no_invite',
  'invalid_invite',
  'email_mismatch',
  'invite_expired',
  'invite_used',
])

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

export const Invite = pgTable('Invite', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: varchar('token', { length: 64 }).notNull().unique(),
  role: Role('role').notNull(),
  email: varchar('email', { length: 255 }),
  createdById: uuid('createdById')
    .notNull()
    .references(() => User.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  coachId: uuid('coachId')
    .references(() => User.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  expiresAt: timestamp('expiresAt', { precision: 3 }).notNull(),
  usedAt: timestamp('usedAt', { precision: 3 }),
  usedByUserId: uuid('usedByUserId')
    .references(() => User.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
});

export const SignInAttempt = pgTable('SignInAttempt', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull(),
  googleProfileId: varchar('googleProfileId', { length: 255 }).notNull(),
  attemptedRole: Role('attemptedRole').notNull(),
  inviteToken: varchar('inviteToken', { length: 64 }),
  outcome: SignInAttemptOutcome('outcome').notNull(),
  createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
});

/** Links coaches to the members on their roster (one coach → many members). */
export const CoachMember = pgTable('CoachMember', {
  id: uuid('id').primaryKey().defaultRandom(),
  coachId: uuid('coachId')
    .notNull()
    .references(() => User.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  memberId: uuid('memberId')
    .notNull()
    .references(() => User.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
});

export const UserRelations = relations(User, ({ one, many }) => ({
  googleProfile: one(GoogleProfile, {
    fields: [User.id],
    references: [GoogleProfile.userId],
  }),
  coachedMembers: many(CoachMember, { relationName: 'coachMembers' }),
  coachAssignment: one(CoachMember, {
    fields: [User.id],
    references: [CoachMember.memberId],
    relationName: 'memberCoach',
  }),
  invitesCreated: many(Invite, { relationName: 'invitesCreated' }),
}));

export const InviteRelations = relations(Invite, ({ one }) => ({
  createdBy: one(User, {
    fields: [Invite.createdById],
    references: [User.id],
    relationName: 'invitesCreated',
  }),
  coach: one(User, {
    fields: [Invite.coachId],
    references: [User.id],
    relationName: 'inviteCoach',
  }),
  usedBy: one(User, {
    fields: [Invite.usedByUserId],
    references: [User.id],
    relationName: 'inviteUsedBy',
  }),
}));

export const GoogleProfileRelations = relations(GoogleProfile, ({ one }) => ({
  user: one(User, {
    fields: [GoogleProfile.userId],
    references: [User.id],
  }),
}));

export const CoachMemberRelations = relations(CoachMember, ({ one }) => ({
  coach: one(User, {
    fields: [CoachMember.coachId],
    references: [User.id],
    relationName: 'coachMembers',
  }),
  member: one(User, {
    fields: [CoachMember.memberId],
    references: [User.id],
    relationName: 'memberCoach',
  }),
}));
