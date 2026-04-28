-- Story 2.4: browse card fields + featured / promotion (indexer-backed table).

ALTER TABLE "leagues" ADD COLUMN "contract_address" TEXT,
ADD COLUMN "entry_token_address" TEXT NOT NULL DEFAULT '0x0000000000000000000000000000000000000000',
ADD COLUMN "entry_token_symbol" TEXT NOT NULL DEFAULT 'ETH',
ADD COLUMN "entry_fee_wei" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN "pool_wei" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN "entry_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "max_entries" INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN "lock_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "promoted_until" TIMESTAMP(3);

CREATE INDEX "idx_leagues_featured" ON "leagues"("featured");
