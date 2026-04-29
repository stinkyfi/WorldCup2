-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "league_address" TEXT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "disputant_address" TEXT NOT NULL,
    "group_id" INTEGER NOT NULL,
    "is_creator" BOOLEAN NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "disputes_tx_hash_key" ON "disputes"("tx_hash");

-- CreateIndex
CREATE INDEX "idx_disputes_chain_league" ON "disputes"("chain_id", "league_address");
