-- Story 2.2: SIWE nonces + HTTP-only cookie sessions

CREATE TABLE "auth_nonces" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_nonces_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_nonces_nonce_key" ON "auth_nonces"("nonce");
CREATE INDEX "idx_auth_nonces_address" ON "auth_nonces"("address");

CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_auth_sessions_expires" ON "auth_sessions"("expires_at");
