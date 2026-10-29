ALTER TABLE "WorkoutBlockExercise" ADD COLUMN "cues" text;--> statement-breakpoint
ALTER TABLE "WorkoutBlockExercise" ADD COLUMN "accessories" text;--> statement-breakpoint
ALTER TABLE "WorkoutTemplateBlockExercise" ADD COLUMN "cues" text;--> statement-breakpoint
ALTER TABLE "WorkoutTemplateBlockExercise" ADD COLUMN "accessories" text;--> statement-breakpoint
UPDATE "WorkoutBlockExercise" SET "cues" = NULLIF(
	CONCAT_WS(' · ', NULLIF("cue1", ''), NULLIF("cue2", ''), NULLIF("cue3", '')),
	''
);--> statement-breakpoint
UPDATE "WorkoutTemplateBlockExercise" SET "cues" = NULLIF(
	CONCAT_WS(' · ', NULLIF("cue1", ''), NULLIF("cue2", ''), NULLIF("cue3", '')),
	''
);--> statement-breakpoint
ALTER TABLE "WorkoutBlockExercise" DROP COLUMN "cue1";--> statement-breakpoint
ALTER TABLE "WorkoutBlockExercise" DROP COLUMN "cue2";--> statement-breakpoint
ALTER TABLE "WorkoutBlockExercise" DROP COLUMN "cue3";--> statement-breakpoint
ALTER TABLE "WorkoutTemplateBlockExercise" DROP COLUMN "cue1";--> statement-breakpoint
ALTER TABLE "WorkoutTemplateBlockExercise" DROP COLUMN "cue2";--> statement-breakpoint
ALTER TABLE "WorkoutTemplateBlockExercise" DROP COLUMN "cue3";
