-- AlterTable: FX conversion can multiply a 15-integer-digit amount beyond Decimal(19,4).
ALTER TABLE "nv_transactions" ALTER COLUMN "base_amount" SET DATA TYPE DECIMAL(27,4);
