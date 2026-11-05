ALTER TABLE "WorkoutLogEntry" ADD COLUMN "prescriptionMode" "ExercisePrescriptionMode";--> statement-breakpoint
ALTER TABLE "WorkoutLogEntry" ADD COLUMN "tempo" varchar(32);--> statement-breakpoint
ALTER TABLE "WorkoutLogEntry" ADD COLUMN "cues" text;--> statement-breakpoint
ALTER TABLE "WorkoutLogEntry" ADD COLUMN "accessories" text;
