-- Story 2.5: league detail + fee breakdown (indexer-backed fields).

ALTER TABLE "leagues"
ADD COLUMN "creator_address" TEXT,
ADD COLUMN "creator_description" TEXT,
ADD COLUMN "revision_policy" TEXT NOT NULL DEFAULT 'Locked',
ADD COLUMN "dev_fee_bps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "creator_fee_bps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "entry_token_decimals" INTEGER NOT NULL DEFAULT 18;

