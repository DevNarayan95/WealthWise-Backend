-- CreateEnum
CREATE TYPE "SessionRevokeReason" AS ENUM ('LOGOUT', 'LOGOUT_ALL', 'REFRESH_TOKEN_REUSED', 'PASSWORD_RESET');

-- CreateTable
CREATE TABLE "nv_auth_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" "SessionRevokeReason",

    CONSTRAINT "nv_auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nv_auth_refresh_tokens" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nv_auth_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nv_auth_sessions_user_id_revoked_at_idx" ON "nv_auth_sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "nv_auth_sessions_expires_at_idx" ON "nv_auth_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "nv_auth_refresh_tokens_token_hash_key" ON "nv_auth_refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "nv_auth_refresh_tokens_session_id_idx" ON "nv_auth_refresh_tokens"("session_id");

-- AddForeignKey
ALTER TABLE "nv_auth_sessions" ADD CONSTRAINT "nv_auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nv_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nv_auth_refresh_tokens" ADD CONSTRAINT "nv_auth_refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "nv_auth_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
