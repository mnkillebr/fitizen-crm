CREATE TABLE "InBodyScan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"memberId" uuid NOT NULL,
	"recordedById" uuid NOT NULL,
	"scannedAt" timestamp (3) NOT NULL,
	"weightLbs" real NOT NULL,
	"skeletalMuscleMassLbs" real NOT NULL,
	"percentBodyFat" real NOT NULL,
	"ecwRatio" real NOT NULL,
	"basalMetabolicRate" real NOT NULL,
	"notes" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "InBodyScan" ADD CONSTRAINT "InBodyScan_memberId_User_id_fk" FOREIGN KEY ("memberId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InBodyScan" ADD CONSTRAINT "InBodyScan_recordedById_User_id_fk" FOREIGN KEY ("recordedById") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;