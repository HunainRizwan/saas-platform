ALTER TABLE "stores" ADD COLUMN "country" text DEFAULT 'Pakistan' NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "currency" text DEFAULT 'PKR' NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "business_category" text;