-- AlterTable
ALTER TABLE "leagues" ADD COLUMN     "last_calculated_at" TIMESTAMP(3),
ALTER COLUMN "lock_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "entries" (
    "id" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "league_address" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "entry_index" INTEGER NOT NULL,
    "entry_id" TEXT NOT NULL,
    "commitment" TEXT NOT NULL,
    "groups_json" JSONB NOT NULL,
    "tiebreaker_total_goals" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scores" (
    "id" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "league_address" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "entry_index" INTEGER NOT NULL,
    "group_id" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "perfect_bonus" BOOLEAN NOT NULL DEFAULT false,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indexer_state" (
    "id" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "last_processed_block" BIGINT NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indexer_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_entries_chain_league" ON "entries"("chain_id", "league_address");

-- CreateIndex
CREATE INDEX "idx_entries_wallet" ON "entries"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_entries_chain_league_wallet_index" ON "entries"("chain_id", "league_address", "wallet_address", "entry_index");

-- CreateIndex
CREATE INDEX "idx_scores_chain_league" ON "scores"("chain_id", "league_address");

-- CreateIndex
CREATE INDEX "idx_scores_wallet" ON "scores"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_scores_entry_group" ON "scores"("chain_id", "league_address", "wallet_address", "entry_index", "group_id");

-- CreateIndex
CREATE UNIQUE INDEX "indexer_state_chain_id_key" ON "indexer_state"("chain_id");
