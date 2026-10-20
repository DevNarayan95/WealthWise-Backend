-- CreateTable
CREATE TABLE "nv_user_income_category_archives" (
    "user_id" UUID NOT NULL,
    "income_category_id" UUID NOT NULL,
    "archived_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nv_user_income_category_archives_pkey" PRIMARY KEY ("user_id","income_category_id")
);

-- Keep existing archive state. Only custom categories could be archived before, and each had one owner.
INSERT INTO "nv_user_income_category_archives" ("user_id", "income_category_id")
SELECT "user_id", "id"
FROM "nv_income_categories"
WHERE "is_archived" = true AND "user_id" IS NOT NULL;

-- AlterTable: dropping the column also drops its index.
ALTER TABLE "nv_income_categories" DROP COLUMN "is_archived";

-- AddForeignKey
ALTER TABLE "nv_user_income_category_archives" ADD CONSTRAINT "nv_user_income_category_archives_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nv_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nv_user_income_category_archives" ADD CONSTRAINT "nv_user_income_category_archives_income_category_id_fkey" FOREIGN KEY ("income_category_id") REFERENCES "nv_income_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
