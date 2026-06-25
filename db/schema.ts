import { sql } from "drizzle-orm";
import { integer, pgEnum, pgTable, text, timestamp, uuid,varchar } from "drizzle-orm/pg-core";

export const Role = pgEnum('Role', ['coach', 'member'])

export const User = pgTable('User', {
	id: uuid('id').defaultRandom(),
  profileId: varchar('profileId'),
	firstName: text('firstName').notNull(),
	lastName: text('lastName').notNull(),
  age: integer(),
  email: varchar({ length: 255 }).notNull().unique(),
	createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
	updatedAt: timestamp('updatedAt', { precision: 3 }).notNull(),
	role: Role('role').notNull()
});