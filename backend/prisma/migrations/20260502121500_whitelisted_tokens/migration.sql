-- Story 3.1: indexer-backed whitelist rows for league creation wizard (Base, Ethereum, Sonic mainnet).
CREATE TABLE "whitelisted_tokens" (
    "id" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "whitelisted_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uniq_whitelisted_tokens_chain_address" ON "whitelisted_tokens"("chain_id", "address");
CREATE INDEX "idx_whitelisted_tokens_chain_id" ON "whitelisted_tokens"("chain_id");

-- Base (8453): native USDC + WETH
INSERT INTO "whitelisted_tokens" ("id", "chain_id", "address", "symbol", "decimals", "sort_order")
VALUES
  ('wlt_base_usdc', 8453, '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 'USDC', 6, 0),
  ('wlt_base_weth', 8453, '0x4200000000000000000000000000000000000006', 'WETH', 18, 1);

-- Ethereum (1): USDC + WETH
INSERT INTO "whitelisted_tokens" ("id", "chain_id", "address", "symbol", "decimals", "sort_order")
VALUES
  ('wlt_eth_usdc', 1, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 6, 0),
  ('wlt_eth_weth', 1, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 'WETH', 18, 1);

-- Sonic (146): USDC + wS (wrapped Sonic)
INSERT INTO "whitelisted_tokens" ("id", "chain_id", "address", "symbol", "decimals", "sort_order")
VALUES
  ('wlt_sonic_usdc', 146, '0x29219dd400f2Bf60Ee511d2200D8323dC2ecf2c9', 'USDC', 6, 0),
  ('wlt_sonic_ws', 146, '0x039e2fB66102314Ce7b64Ce5Ce3E5183Df478463', 'wS', 18, 1);
