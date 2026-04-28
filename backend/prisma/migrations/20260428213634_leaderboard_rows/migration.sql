-- AlterTable
ALTER TABLE "leagues" ALTER COLUMN "lock_at" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days');

-- CreateTable
CREATE TABLE "leaderboard_rows" (
    "id" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "league_address" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "entry_index" INTEGER NOT NULL,
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "prev_rank" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaderboard_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_leaderboard_chain_league_rank" ON "leaderboard_rows"("chain_id", "league_address", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_leaderboard_row_entry" ON "leaderboard_rows"("chain_id", "league_address", "wallet_address", "entry_index");
