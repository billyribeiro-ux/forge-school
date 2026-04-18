ALTER TABLE "products" ADD COLUMN "tags" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "thumbnail_url" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "featured_order" integer;--> statement-breakpoint
CREATE INDEX "products_featured_idx" ON "products" USING btree ("featured_order");