CREATE TYPE "public"."ExerciseEquipment" AS ENUM('machine', 'barbell', 'dumbbell', 'kettlebell', 'resistance_band', 'cable', 'bodyweight');--> statement-breakpoint
CREATE TYPE "public"."ExercisePlaneOfMotion" AS ENUM('sagittal', 'frontal', 'transverse');--> statement-breakpoint
CREATE TYPE "public"."ExercisePrescriptionMode" AS ENUM('reps', 'time');--> statement-breakpoint
CREATE TYPE "public"."ExerciseSupport" AS ENUM('unilateral', 'bilateral');--> statement-breakpoint
CREATE TYPE "public"."WorkoutBlockType" AS ENUM('circuit', 'interval', 'segment');--> statement-breakpoint
CREATE TYPE "public"."WorkoutStyle" AS ENUM('strength_circuit', 'hiit', 'cardio');--> statement-breakpoint
CREATE TABLE "Exercise" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"planeOfMotion" "ExercisePlaneOfMotion" NOT NULL,
	"support" "ExerciseSupport" NOT NULL,
	"equipment" "ExerciseEquipment" NOT NULL,
	"createdById" uuid,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Workout" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coachId" uuid NOT NULL,
	"memberId" uuid NOT NULL,
	"workoutDate" timestamp (3) NOT NULL,
	"style" "WorkoutStyle" NOT NULL,
	"title" text,
	"notes" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "WorkoutBlock" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workoutId" uuid NOT NULL,
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
CREATE TABLE "WorkoutBlockExercise" (
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
CREATE TABLE "WorkoutLog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workoutId" uuid,
	"coachId" uuid NOT NULL,
	"memberId" uuid NOT NULL,
	"loggedById" uuid NOT NULL,
	"completedAt" timestamp (3) NOT NULL,
	"notes" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "WorkoutLogEntry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workoutLogId" uuid NOT NULL,
	"blockExerciseId" uuid,
	"exerciseId" uuid NOT NULL,
	"roundNumber" integer DEFAULT 1 NOT NULL,
	"setNumber" integer,
	"actualReps" integer,
	"actualDurationSeconds" integer,
	"actualRpe" integer,
	"actualWeight" real,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_createdById_User_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_coachId_User_id_fk" FOREIGN KEY ("coachId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_memberId_User_id_fk" FOREIGN KEY ("memberId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkoutBlock" ADD CONSTRAINT "WorkoutBlock_workoutId_Workout_id_fk" FOREIGN KEY ("workoutId") REFERENCES "public"."Workout"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkoutBlockExercise" ADD CONSTRAINT "WorkoutBlockExercise_blockId_WorkoutBlock_id_fk" FOREIGN KEY ("blockId") REFERENCES "public"."WorkoutBlock"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkoutBlockExercise" ADD CONSTRAINT "WorkoutBlockExercise_exerciseId_Exercise_id_fk" FOREIGN KEY ("exerciseId") REFERENCES "public"."Exercise"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_workoutId_Workout_id_fk" FOREIGN KEY ("workoutId") REFERENCES "public"."Workout"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_coachId_User_id_fk" FOREIGN KEY ("coachId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_memberId_User_id_fk" FOREIGN KEY ("memberId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_loggedById_User_id_fk" FOREIGN KEY ("loggedById") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkoutLogEntry" ADD CONSTRAINT "WorkoutLogEntry_workoutLogId_WorkoutLog_id_fk" FOREIGN KEY ("workoutLogId") REFERENCES "public"."WorkoutLog"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkoutLogEntry" ADD CONSTRAINT "WorkoutLogEntry_blockExerciseId_WorkoutBlockExercise_id_fk" FOREIGN KEY ("blockExerciseId") REFERENCES "public"."WorkoutBlockExercise"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WorkoutLogEntry" ADD CONSTRAINT "WorkoutLogEntry_exerciseId_Exercise_id_fk" FOREIGN KEY ("exerciseId") REFERENCES "public"."Exercise"("id") ON DELETE restrict ON UPDATE cascade;