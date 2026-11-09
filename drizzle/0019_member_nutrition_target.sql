CREATE TYPE "public"."NutritionSex" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."NutritionActivityLevel" AS ENUM('sedentary', 'light', 'moderate', 'active', 'very_active', 'extra_active');--> statement-breakpoint
CREATE TYPE "public"."NutritionGoal" AS ENUM('maintain', 'mild_loss', 'moderate_loss', 'mild_gain', 'moderate_gain');--> statement-breakpoint
CREATE TABLE "MemberNutritionTarget" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"age" integer NOT NULL,
	"sex" "NutritionSex" NOT NULL,
	"heightInches" real NOT NULL,
	"weightLbs" real NOT NULL,
	"activityLevel" "NutritionActivityLevel" NOT NULL,
	"goal" "NutritionGoal" NOT NULL,
	"bmr" real NOT NULL,
	"tdee" real NOT NULL,
	"targetCalories" real NOT NULL,
	"proteinPercent" integer NOT NULL,
	"carbsPercent" integer NOT NULL,
	"fatPercent" integer NOT NULL,
	"proteinGrams" integer NOT NULL,
	"carbsGrams" integer NOT NULL,
	"fatGrams" integer NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	CONSTRAINT "MemberNutritionTarget_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
ALTER TABLE "MemberNutritionTarget" ADD CONSTRAINT "MemberNutritionTarget_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
