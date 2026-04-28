import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { createApp } from "../src/createApp.js";
import { prisma } from "../src/db.js";

const RUN = Boolean(process.env.DATABASE_URL);
const prefix = "__og_html_test__";

beforeEach(async () => {
  if (!RUN) return;
  await prisma.league.deleteMany({ where: { title: { startsWith: prefix } } });
});

test(
  "GET /league/:address returns HTML with league og:title and description",
  { skip: !RUN },
  async () => {
    const lock = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const addr = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    await prisma.league.create({
      data: {
        chainId: 84532,
        title: `${prefix} OG League`,
        contractAddress: addr,
        creatorAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        creatorDescription: null,
        revisionPolicy: "Free",
        entryTokenSymbol: "USDC",
        entryTokenDecimals: 6,
        entryTokenAddress: "0xcccccccccccccccccccccccccccccccccccccccc",
        entryFeeWei: 2_000_000n,
        poolWei: 10_000_000n,
        entryCount: 2,
        maxEntries: 20,
        lockAt: lock,
        devFeeBps: 100,
        creatorFeeBps: 100,
        featured: false,
      },
    });

    const app = await createApp();
    const res = await app.inject({ method: "GET", url: `/league/${addr}` });
    assert.equal(res.statusCode, 200);
    assert.ok(res.payload.includes(`${prefix} OG League`));
    assert.ok(res.payload.includes('property="og:title"'));
    assert.ok(res.payload.includes("Entry"));
    assert.ok(res.payload.includes("Pool"));
    assert.ok(res.payload.includes('property="og:url"'));
    assert.ok(res.payload.includes("/league/"));
    await app.close();
  },
);
