CREATE TYPE "public"."item_category" AS ENUM('Phones', 'Electronics', 'Bags', 'Wallets', 'IDs and Cards', 'Keys', 'Books', 'Clothing', 'Accessories', 'Other');--> statement-breakpoint
CREATE TYPE "public"."claim_status" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('open', 'claimed', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."item_type" AS ENUM('lost', 'found');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('student', 'staff');--> statement-breakpoint
CREATE TABLE "claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"claimant_id" integer NOT NULL,
	"message" text NOT NULL,
	"contact" varchar(40),
	"status" "claim_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "claims_item_claimant_unique" UNIQUE("item_id","claimant_id"),
	CONSTRAINT "claims_message_length" CHECK (length("claims"."message") >= 10)
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "item_type" NOT NULL,
	"title" varchar(120) NOT NULL,
	"description" text NOT NULL,
	"category" "item_category" NOT NULL,
	"location" varchar(140) NOT NULL,
	"happened_on" date NOT NULL,
	"image_url" text,
	"status" "item_status" DEFAULT 'open' NOT NULL,
	"posted_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mime" varchar(60) NOT NULL,
	"data" "bytea" NOT NULL,
	"uploaded_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(160) NOT NULL,
	"phone" varchar(20),
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'student' NOT NULL,
	"department" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_claimant_id_users_id_fk" FOREIGN KEY ("claimant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_posted_by_users_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "items_type_status_idx" ON "items" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX "items_category_idx" ON "items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "items_posted_by_idx" ON "items" USING btree ("posted_by");