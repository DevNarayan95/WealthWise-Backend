-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'TRANSFER_IN';
ALTER TYPE "TransactionType" ADD VALUE 'TRANSFER_OUT';

-- AlterTable
ALTER TABLE "nv_transactions" ADD COLUMN     "transfer_exchange_rate" DECIMAL(19,8),
ADD COLUMN     "transfer_group_id" UUID,
ADD COLUMN     "transfer_rate_source" "RateSource";

-- CreateIndex
CREATE UNIQUE INDEX "nv_transactions_transfer_group_id_type_key" ON "nv_transactions"("transfer_group_id", "type");

-- A transfer leg must belong to a transfer group, and only transfer legs may have one.
-- The enum is cast to text so this migration does not use the newly added enum values as literals.
ALTER TABLE "nv_transactions" ADD CONSTRAINT "nv_transactions_transfer_group_matches_type_check" CHECK (
  (("type")::text IN ('TRANSFER_IN', 'TRANSFER_OUT')) = ("transfer_group_id" IS NOT NULL)
);

-- Transfer rate fields are only meaningful on transfer legs.
ALTER TABLE "nv_transactions" ADD CONSTRAINT "nv_transactions_transfer_rate_matches_type_check" CHECK (
  (("type")::text IN ('TRANSFER_IN', 'TRANSFER_OUT'))
  OR ("transfer_exchange_rate" IS NULL AND "transfer_rate_source" IS NULL)
);
