CREATE TYPE "public"."ExerciseMuscleGroup" AS ENUM('chest', 'back', 'shoulders', 'arms', 'legs', 'core');--> statement-breakpoint
ALTER TYPE "public"."ExerciseEquipment" ADD VALUE 'trx';--> statement-breakpoint
ALTER TYPE "public"."ExerciseEquipment" ADD VALUE 'rings';--> statement-breakpoint
ALTER TYPE "public"."ExerciseEquipment" ADD VALUE 'foam_roller';--> statement-breakpoint
ALTER TYPE "public"."ExerciseEquipment" ADD VALUE 'stability_ball';--> statement-breakpoint
ALTER TYPE "public"."ExerciseEquipment" ADD VALUE 'medicine_ball';--> statement-breakpoint
ALTER TYPE "public"."ExerciseEquipment" ADD VALUE 'sandbag';--> statement-breakpoint
ALTER TYPE "public"."ExerciseEquipment" ADD VALUE 'sled';--> statement-breakpoint
ALTER TYPE "public"."ExerciseEquipment" ADD VALUE 'rower';--> statement-breakpoint
ALTER TYPE "public"."ExerciseEquipment" ADD VALUE 'ski_erg';--> statement-breakpoint
ALTER TYPE "public"."ExerciseEquipment" ADD VALUE 'parallettes';--> statement-breakpoint
ALTER TYPE "public"."ExerciseEquipment" ADD VALUE 'trap_bar';--> statement-breakpoint
ALTER TYPE "public"."ExerciseEquipment" ADD VALUE 'glider';--> statement-breakpoint
ALTER TYPE "public"."ExerciseEquipment" ADD VALUE 'plyo_box';--> statement-breakpoint
ALTER TYPE "public"."ExerciseSupport" ADD VALUE 'dynamic';--> statement-breakpoint
CREATE TABLE "WorkoutTemplate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coachId" uuid NOT NULL,
	"style" "WorkoutStyle" NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "WorkoutTemplateBlock" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"templateId" uuid NOT NULL,
	"blockType" "WorkoutBlockType" NOT NULL,
	"orderIndex" integer NOT NULL,
	"name" text,
	"rounds" integer,
	"restBetweenRoundsSeconds" integer,
	"workDurationSeconds" integer,
	"restDurationSeconds" integer,
	"targetDurationSeconds" integer,
	"targetIntensity" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "WorkoutTemplateBlockExercise" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blockId" uuid NOT NULL,
	"exerciseId" uuid NOT NULL,
	"orderIndex" integer NOT NULL,
	"prescriptionMode" "ExercisePrescriptionMode" NOT NULL,
	"targetReps" integer,
	"targetDurationSeconds" integer,
	"targetRpe" integer,
	"targetWeight" real,
	"tempo" varchar(32),
	"cue1" text,
	"cue2" text,
	"cue3" text,
	"restAfterSeconds" integer
);
--> statement-breakpoint
ALTER TABLE "Exercise" ADD COLUMN "muscleGroup" "ExerciseMuscleGroup" NOT NULL;--> statement-breakpoint
ALTER TABLE "WorkoutTemplate" ADD CONSTRAINT "WorkoutTemplate_coachId_User_id_fk" FOREIGN KEY ("coachId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkoutTemplateBlock" ADD CONSTRAINT "WorkoutTemplateBlock_templateId_WorkoutTemplate_id_fk" FOREIGN KEY ("templateId") REFERENCES "public"."WorkoutTemplate"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkoutTemplateBlockExercise" ADD CONSTRAINT "WorkoutTemplateBlockExercise_blockId_WorkoutTemplateBlock_id_fk" FOREIGN KEY ("blockId") REFERENCES "public"."WorkoutTemplateBlock"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkoutTemplateBlockExercise" ADD CONSTRAINT "WorkoutTemplateBlockExercise_exerciseId_Exercise_id_fk" FOREIGN KEY ("exerciseId") REFERENCES "public"."Exercise"("id") ON DELETE restrict ON UPDATE cascade;