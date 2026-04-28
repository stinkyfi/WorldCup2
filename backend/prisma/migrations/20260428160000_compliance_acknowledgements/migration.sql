-- Story 4.1: compliance acknowledgements (wallet + league + timestamp)

CREATE TABLE IF NOT EXISTS "compliance_acknowledgements" (
  "id" TEXT NOT NULL,
  "league_id" TEXT NOT NULL,
  "wallet_address" TEXT NOT NULL,
  "acknowledged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "compliance_acknowledgements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_compliance_league_wallet"
  ON "compliance_acknowledgements"("league_id", "wallet_address");

CREATE INDEX IF NOT EXISTS "idx_compliance_wallet_address"
  ON "compliance_acknowledgements"("wallet_address");

CREATE INDEX IF NOT EXISTS "idx_compliance_league_id"
  ON "compliance_acknowledgements"("league_id");

