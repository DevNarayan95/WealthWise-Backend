-- AlterTable: add the normalized name used for case-insensitive duplicate checks.
ALTER TABLE "income_categories" ADD COLUMN "normalized_name" VARCHAR(100);

-- Backfill existing rows (trimmed, lower-cased) before enforcing NOT NULL.
UPDATE "income_categories" SET "normalized_name" = lower(btrim("name"));

ALTER TABLE "income_categories" ALTER COLUMN "normalized_name" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "income_categories_user_id_normalized_name_key" ON "income_categories"("user_id", "normalized_name");
