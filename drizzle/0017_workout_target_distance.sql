ALTER TABLE "WorkoutBlockExercise" ADD COLUMN IF NOT EXISTS "targetDistance" integer;--> statement-breakpoint
ALTER TABLE "WorkoutTemplateBlockExercise" ADD COLUMN IF NOT EXISTS "targetDistance" integer;
