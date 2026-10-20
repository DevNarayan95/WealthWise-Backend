-- CreateTable
CREATE TABLE "nv_exchange_rates" (
    "id" UUID NOT NULL,
    "from_currency" VARCHAR(3) NOT NULL,
    "to_currency" VARCHAR(3) NOT NULL,
    "rate_date" DATE NOT NULL,
    "rate" DECIMAL(19,8) NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nv_exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nv_exchange_rates_from_currency_to_currency_rate_date_key" ON "nv_exchange_rates"("from_currency", "to_currency", "rate_date");
