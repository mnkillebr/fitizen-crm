CREATE TYPE "public"."ExerciseSwapReason" AS ENUM('client_needs_regression', 'equipment_unavailable', 'client_needs_progression');--> statement-breakpoint
ALTER TYPE "public"."ExerciseEquipment" ADD VALUE 'landmine';--> statement-breakpoint
ALTER TABLE "WorkoutLogEntry" ADD COLUMN "originalExerciseId" uuid;--> statement-breakpoint
ALTER TABLE "WorkoutLogEntry" ADD COLUMN "swapReason" "ExerciseSwapReason";--> statement-breakpoint
ALTER TABLE "WorkoutLogEntry" ADD CONSTRAINT "WorkoutLogEntry_originalExerciseId_Exercise_id_fk" FOREIGN KEY ("originalExerciseId") REFERENCES "public"."Exercise"("id") ON DELETE set null ON UPDATE cascade;