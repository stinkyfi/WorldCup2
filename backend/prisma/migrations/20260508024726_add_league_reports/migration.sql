-- AlterTable
ALTER TABLE "leagues" ADD COLUMN     "warned_at" TIMESTAMP(3),
ALTER COLUMN "lock_at" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days');

-- CreateTable
CREATE TABLE "league_reports" (
    "id" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "league_address" TEXT NOT NULL,
    "reporter_wallet" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "league_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_league_reports_chain_league" ON "league_reports"("chain_id", "league_address");

-- CreateIndex
CREATE INDEX "idx_league_reports_status" ON "league_reports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_report_chain_league_wallet" ON "league_reports"("chain_id", "league_address", "reporter_wallet");
