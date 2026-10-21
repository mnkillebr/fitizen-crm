CREATE TYPE "public"."Role" AS ENUM('coach', 'member');--> statement-breakpoint
CREATE TYPE "public"."SignInAttemptOutcome" AS ENUM('no_invite', 'invalid_invite', 'email_mismatch', 'invite_expired', 'invite_used');--> statement-breakpoint
CREATE TABLE "CoachMember" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coachId" uuid NOT NULL,
	"memberId" uuid NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "GoogleProfile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid,
	"profileId" varchar NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" text NOT NULL,
	"picture" text NOT NULL,
	"verifiedEmail" boolean DEFAULT false NOT NULL,
	CONSTRAINT "GoogleProfile_profileId_unique" UNIQUE("profileId"),
	CONSTRAINT "GoogleProfile_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "Invite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(64) NOT NULL,
	"role" "Role" NOT NULL,
	"email" varchar(255),
	"createdById" uuid NOT NULL,
	"coachId" uuid,
	"expiresAt" timestamp (3) NOT NULL,
	"usedAt" timestamp (3),
	"usedByUserId" uuid,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "Invite_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "SignInAttempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"googleProfileId" varchar(255) NOT NULL,
	"attemptedRole" "Role" NOT NULL,
	"inviteToken" varchar(64),
	"outcome" "SignInAttemptOutcome" NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firstName" text NOT NULL,
	"lastName" text NOT NULL,
	"age" integer,
	"email" varchar(255) NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"role" "Role" NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"admin" boolean DEFAULT false NOT NULL,
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "CoachMember" ADD CONSTRAINT "CoachMember_coachId_User_id_fk" FOREIGN KEY ("coachId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CoachMember" ADD CONSTRAINT "CoachMember_memberId_User_id_fk" FOREIGN KEY ("memberId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GoogleProfile" ADD CONSTRAINT "GoogleProfile_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_createdById_User_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_coachId_User_id_fk" FOREIGN KEY ("coachId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_usedByUserId_User_id_fk" FOREIGN KEY ("usedByUserId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;