-- Rebrand: prefix every table with "nv_" and align constraint and index names
-- with the Prisma defaults for the mapped table names. Data is preserved.

-- Tables
ALTER TABLE "users" RENAME TO "nv_users";
ALTER TABLE "permissions" RENAME TO "nv_permissions";
ALTER TABLE "role_permissions" RENAME TO "nv_role_permissions";
ALTER TABLE "roles" RENAME TO "nv_roles";
ALTER TABLE "user_roles" RENAME TO "nv_user_roles";
ALTER TABLE "accounts" RENAME TO "nv_accounts";
ALTER TABLE "transactions" RENAME TO "nv_transactions";
ALTER TABLE "income_categories" RENAME TO "nv_income_categories";
ALTER TABLE "email_otps" RENAME TO "nv_email_otps";

-- Primary keys (renaming the index also renames its constraint)
ALTER INDEX "users_pkey" RENAME TO "nv_users_pkey";
ALTER INDEX "permissions_pkey" RENAME TO "nv_permissions_pkey";
ALTER INDEX "role_permissions_pkey" RENAME TO "nv_role_permissions_pkey";
ALTER INDEX "roles_pkey" RENAME TO "nv_roles_pkey";
ALTER INDEX "user_roles_pkey" RENAME TO "nv_user_roles_pkey";
ALTER INDEX "accounts_pkey" RENAME TO "nv_accounts_pkey";
ALTER INDEX "transactions_pkey" RENAME TO "nv_transactions_pkey";
ALTER INDEX "income_categories_pkey" RENAME TO "nv_income_categories_pkey";
ALTER INDEX "email_otps_pkey" RENAME TO "nv_email_otps_pkey";

-- Unique indexes
ALTER INDEX "users_email_key" RENAME TO "nv_users_email_key";
ALTER INDEX "permissions_resource_action_key" RENAME TO "nv_permissions_resource_action_key";
ALTER INDEX "roles_name_key" RENAME TO "nv_roles_name_key";
ALTER INDEX "transactions_reversal_of_transaction_id_key" RENAME TO "nv_transactions_reversal_of_transaction_id_key";
ALTER INDEX "income_categories_user_id_normalized_name_key" RENAME TO "nv_income_categories_user_id_normalized_name_key";

-- Secondary indexes
ALTER INDEX "users_status_idx" RENAME TO "nv_users_status_idx";
ALTER INDEX "users_created_at_idx" RENAME TO "nv_users_created_at_idx";
ALTER INDEX "permissions_resource_idx" RENAME TO "nv_permissions_resource_idx";
ALTER INDEX "role_permissions_permission_id_idx" RENAME TO "nv_role_permissions_permission_id_idx";
ALTER INDEX "user_roles_role_id_idx" RENAME TO "nv_user_roles_role_id_idx";
ALTER INDEX "accounts_user_id_idx" RENAME TO "nv_accounts_user_id_idx";
ALTER INDEX "accounts_user_id_status_idx" RENAME TO "nv_accounts_user_id_status_idx";
ALTER INDEX "transactions_account_id_idx" RENAME TO "nv_transactions_account_id_idx";
ALTER INDEX "transactions_account_id_transaction_date_idx" RENAME TO "nv_transactions_account_id_transaction_date_idx";
ALTER INDEX "income_categories_user_id_is_archived_idx" RENAME TO "nv_income_categories_user_id_is_archived_idx";
ALTER INDEX "email_otps_user_id_purpose_idx" RENAME TO "nv_email_otps_user_id_purpose_idx";
ALTER INDEX "email_otps_expires_at_idx" RENAME TO "nv_email_otps_expires_at_idx";

-- Foreign keys
ALTER TABLE "nv_role_permissions" RENAME CONSTRAINT "role_permissions_role_id_fkey" TO "nv_role_permissions_role_id_fkey";
ALTER TABLE "nv_role_permissions" RENAME CONSTRAINT "role_permissions_permission_id_fkey" TO "nv_role_permissions_permission_id_fkey";
ALTER TABLE "nv_user_roles" RENAME CONSTRAINT "user_roles_user_id_fkey" TO "nv_user_roles_user_id_fkey";
ALTER TABLE "nv_user_roles" RENAME CONSTRAINT "user_roles_role_id_fkey" TO "nv_user_roles_role_id_fkey";
ALTER TABLE "nv_accounts" RENAME CONSTRAINT "accounts_user_id_fkey" TO "nv_accounts_user_id_fkey";
ALTER TABLE "nv_transactions" RENAME CONSTRAINT "transactions_account_id_fkey" TO "nv_transactions_account_id_fkey";
ALTER TABLE "nv_transactions" RENAME CONSTRAINT "transactions_reversal_of_transaction_id_fkey" TO "nv_transactions_reversal_of_transaction_id_fkey";
ALTER TABLE "nv_transactions" RENAME CONSTRAINT "transactions_income_category_id_fkey" TO "nv_transactions_income_category_id_fkey";
ALTER TABLE "nv_income_categories" RENAME CONSTRAINT "income_categories_user_id_fkey" TO "nv_income_categories_user_id_fkey";
ALTER TABLE "nv_email_otps" RENAME CONSTRAINT "email_otps_user_id_fkey" TO "nv_email_otps_user_id_fkey";
