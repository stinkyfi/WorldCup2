import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { createApp } from "../src/createApp.js";
import { prisma } from "../src/db.js";

const RUN = Boolean(process.env.DATABASE_URL);
const prefix = "__detail_test__";

beforeEach(async () => {
  if (!RUN) return;
  await prisma.league.deleteMany({ where: { title: { startsWith: prefix } } });
});

test(
  "GET /api/v1/leagues/by-address/:address returns league + fee breakdown",
  { skip: !RUN },
  async () => {
    const lock = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const league = await prisma.league.create({
      data: {
        chainId: 84532,
        title: `${prefix} league`,
        contractAddress: "0x1111111111111111111111111111111111111111",
        creatorAddress: "0x2222222222222222222222222222222222222222",
        creatorDescription: "Test creator description",
        revisionPolicy: "Free",
        entryTokenSymbol: "USDC",
        entryTokenDecimals: 6,
        entryTokenAddress: "0x3333333333333333333333333333333333333333",
        entryFeeWei: 1_000_000n,
        poolWei: 5_000_000n,
        entryCount: 5,
        maxEntries: 100,
        lockAt: lock,
        devFeeBps: 200,
        creatorFeeBps: 300,
        featured: true,
      },
    });

    const app = await createApp();
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/leagues/by-address/${league.contractAddress}`,
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body) as {
      data: {
        league: {
          id: string;
          title: string;
          contractAddress: string | null;
          creatorAddress: string | null;
          revisionPolicy: string;
          isFeatured: boolean;
          feeBreakdown: { devFeeAmountWei: string; creatorFeeAmountWei: string; prizePoolAmountWei: string };
        };
      };
    };
    assert.equal(body.data.league.title, `${prefix} league`);
    assert.equal(body.data.league.contractAddress?.toLowerCase(), league.contractAddress?.toLowerCase());
    assert.equal(body.data.league.creatorAddress?.toLowerCase(), "0x2222222222222222222222222222222222222222");
    assert.equal(body.data.league.revisionPolicy, "Free");
    assert.equal(body.data.league.isFeatured, true);
    assert.equal(body.data.league.feeBreakdown.devFeeAmountWei, "20000");
    assert.equal(body.data.league.feeBreakdown.creatorFeeAmountWei, "30000");
    assert.equal(body.data.league.feeBreakdown.prizePoolAmountWei, "950000");
    await app.close();
  },
);

test(
  "GET /api/v1/leagues/by-address/:address returns 404 for missing league",
  { skip: !RUN },
  async () => {
    const app = await createApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/leagues/by-address/0x9999999999999999999999999999999999999999",
    });
    assert.equal(res.statusCode, 404);
    await app.close();
  },
);

