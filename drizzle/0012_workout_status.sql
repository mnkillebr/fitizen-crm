CREATE TYPE "public"."WorkoutStatus" AS ENUM('scheduled', 'in_progress', 'completed', 'no_show');--> statement-breakpoint
ALTER TABLE "Workout" ADD COLUMN "status" "WorkoutStatus" DEFAULT 'scheduled' NOT NULL;
