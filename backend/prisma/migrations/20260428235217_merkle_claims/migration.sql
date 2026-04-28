-- CreateTable
CREATE TABLE "merkle_claims" (
    "id" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "league_address" TEXT NOT NULL,
    "claimant_address" TEXT NOT NULL,
    "amount_wei" BIGINT NOT NULL,
    "claim_type" INTEGER NOT NULL,
    "proof_json" JSONB NOT NULL,
    "leaf_hex" TEXT NOT NULL,
    "merkle_root_hex" TEXT NOT NULL,
    "tx_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merkle_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_merkle_claims_chain_league" ON "merkle_claims"("chain_id", "league_address");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_merkle_claim_league_wallet_claim_type" ON "merkle_claims"("chain_id", "league_address", "claimant_address", "claim_type");
