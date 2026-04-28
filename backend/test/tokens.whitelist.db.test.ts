import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "../src/createApp.js";

const RUN = Boolean(process.env.DATABASE_URL);

test(
  "GET /api/v1/tokens/whitelisted returns USDC on Base mainnet",
  { skip: !RUN },
  async () => {
    const app = await createApp();
    const res = await app.inject({ method: "GET", url: "/api/v1/tokens/whitelisted?chainId=8453" });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body) as {
      data: { chainId: number; tokens: { symbol: string; decimals: number; minEntryWei: string; address: string }[] };
    };
    assert.equal(body.data.chainId, 8453);
    const usdc = body.data.tokens.find((t) => t.symbol === "USDC");
    assert.ok(usdc);
    assert.equal(usdc.decimals, 6);
    assert.equal(usdc.minEntryWei, "10000");
    assert.match(usdc.address, /^0x[a-fA-F0-9]{40}$/);
    await app.close();
  },
);

test("GET /api/v1/tokens/whitelisted rejects unknown chain", async () => {
  const app = await createApp();
  const res = await app.inject({ method: "GET", url: "/api/v1/tokens/whitelisted?chainId=99999" });
  assert.equal(res.statusCode, 422);
  await app.close();
});
