-- Epic 7.3 — link Postgres dispute row to League dispute slot + record resolution tx hash
ALTER TABLE "disputes" ADD COLUMN "on_chain_dispute_index" INTEGER;
ALTER TABLE "disputes" ADD COLUMN "resolution_tx_hash" TEXT;
