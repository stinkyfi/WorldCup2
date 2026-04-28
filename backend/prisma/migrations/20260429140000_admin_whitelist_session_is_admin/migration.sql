-- Story 2.3: admin whitelist + session.isAdmin

ALTER TABLE "auth_sessions" ADD COLUMN "is_admin" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uniq_admins_address_chain" ON "admins"("address", "chain_id");
