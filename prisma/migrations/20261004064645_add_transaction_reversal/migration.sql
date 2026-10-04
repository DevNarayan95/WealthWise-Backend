/*
  Warnings:

  - A unique constraint covering the columns `[reversal_of_transaction_id]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "reversal_of_transaction_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "transactions_reversal_of_transaction_id_key" ON "transactions"("reversal_of_transaction_id");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_reversal_of_transaction_id_fkey" FOREIGN KEY ("reversal_of_transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
