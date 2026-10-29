CREATE TYPE "public"."WorkoutLogStatus" AS ENUM('in_progress', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
ALTER TABLE "WorkoutLog" ADD COLUMN "status" "WorkoutLogStatus";--> statement-breakpoint
UPDATE "WorkoutLog" SET "status" = CASE WHEN "completedAt" IS NOT NULL THEN 'completed'::"WorkoutLogStatus" ELSE 'in_progress'::"WorkoutLogStatus" END WHERE "status" IS NULL;--> statement-breakpoint
ALTER TABLE "WorkoutLog" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "WorkoutLog" ADD COLUMN "startedAt" timestamp (3) DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "WorkoutLog" ADD COLUMN "updatedAt" timestamp (3) DEFAULT now() NOT NULL;
