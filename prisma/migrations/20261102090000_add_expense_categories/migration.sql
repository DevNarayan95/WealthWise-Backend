-- CreateEnum
CREATE TYPE "RateSource" AS ENUM ('PROVIDER', 'FALLBACK', 'MANUAL', 'IDENTITY');

-- AlterTable: add nullable first so existing rows can be backfilled.
ALTER TABLE "nv_transactions"
  ADD COLUMN "base_amount" DECIMAL(19,4),
  ADD COLUMN "base_currency" CHAR(3),
  ADD COLUMN "exchange_rate" DECIMAL(19,8),
  ADD COLUMN "expense_category_id" UUID,
  ADD COLUMN "rate_date" DATE,
  ADD COLUMN "rate_source" "RateSource",
  ALTER COLUMN "transaction_date" SET DATA TYPE DATE;

-- Backfill. Existing rows can only be backfilled exactly when they are in the base currency (INR).
-- Rows in other currencies would need historical rates, so the migration stops and asks for a data reset.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "nv_transactions" WHERE "currency" <> 'INR') THEN
    RAISE EXCEPTION 'nv_transactions contains non-INR rows. Delete them (development data) before applying this migration.';
  END IF;
END $$;

UPDATE "nv_transactions" SET
  "base_currency" = 'INR',
  "base_amount" = "amount",
  "exchange_rate" = 1,
  "rate_date" = "transaction_date",
  "rate_source" = 'IDENTITY';

ALTER TABLE "nv_transactions"
  ALTER COLUMN "base_amount" SET NOT NULL,
  ALTER COLUMN "base_currency" SET NOT NULL,
  ALTER COLUMN "exchange_rate" SET NOT NULL,
  ALTER COLUMN "rate_date" SET NOT NULL,
  ALTER COLUMN "rate_source" SET NOT NULL;

-- CreateTable
CREATE TABLE "nv_expense_categories" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "normalized_name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nv_expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nv_user_expense_category_archives" (
    "user_id" UUID NOT NULL,
    "expense_category_id" UUID NOT NULL,
    "archived_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nv_user_expense_category_archives_pkey" PRIMARY KEY ("user_id","expense_category_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nv_expense_categories_user_id_normalized_name_key" ON "nv_expense_categories"("user_id", "normalized_name");

-- AddForeignKey
ALTER TABLE "nv_expense_categories" ADD CONSTRAINT "nv_expense_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nv_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nv_user_expense_category_archives" ADD CONSTRAINT "nv_user_expense_category_archives_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nv_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nv_user_expense_category_archives" ADD CONSTRAINT "nv_user_expense_category_archives_expense_category_id_fkey" FOREIGN KEY ("expense_category_id") REFERENCES "nv_expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nv_transactions" ADD CONSTRAINT "nv_transactions_expense_category_id_fkey" FOREIGN KEY ("expense_category_id") REFERENCES "nv_expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Partial unique indexes: PostgreSQL treats NULL user_id values as distinct, so the composite
-- unique constraint does not stop duplicate system (shared) category names.
CREATE UNIQUE INDEX "nv_expense_categories_system_normalized_name_key" ON "nv_expense_categories"("normalized_name") WHERE "user_id" IS NULL;
CREATE UNIQUE INDEX "nv_income_categories_system_normalized_name_key" ON "nv_income_categories"("normalized_name") WHERE "user_id" IS NULL;

-- A transaction is either an income or an expense, so a category of the other kind must not be linked.
-- Reversal rows are created with the opposite type, so they still follow the same rule.
ALTER TABLE "nv_transactions" ADD CONSTRAINT "nv_transactions_category_matches_type_check" CHECK (
  ("type" = 'INCOME' OR "income_category_id" IS NULL) AND
  ("type" = 'EXPENSE' OR "expense_category_id" IS NULL)
);
