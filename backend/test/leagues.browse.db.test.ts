import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { createApp } from "../src/createApp.js";
import { prisma } from "../src/db.js";

const RUN = Boolean(process.env.DATABASE_URL);

const prefix = "__browse_test__";

beforeEach(async () => {
  if (!RUN) return;
  await prisma.league.deleteMany({ where: { title: { startsWith: prefix } } });
});

test(
  "GET /api/v1/leagues/browse returns featured row and filtered main grid",
  { skip: !RUN },
  async () => {
    const lock = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const promoted = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    await prisma.league.createMany({
      data: [
        {
          chainId: 84532,
          title: `${prefix} featured`,
          entryTokenSymbol: "USDC",
          entryTokenAddress: "0x1111111111111111111111111111111111111111",
          entryFeeWei: 50n,
          poolWei: 1000n,
          entryCount: 3,
          maxEntries: 100,
          lockAt: lock,
          featured: true,
          promotedUntil: null,
        },
        {
          chainId: 84532,
          title: `${prefix} promoted`,
          entryTokenSymbol: "USDC",
          entryTokenAddress: "0x2222222222222222222222222222222222222222",
          entryFeeWei: 20n,
          poolWei: 500n,
          entryCount: 1,
          maxEntries: 50,
          lockAt: lock,
          featured: false,
          promotedUntil: promoted,
        },
        {
          chainId: 1,
          title: `${prefix} eth main`,
          entryTokenSymbol: "ETH",
          entryTokenAddress: "0x0000000000000000000000000000000000000000",
          entryFeeWei: 1n,
          poolWei: 100n,
          entryCount: 0,
          maxEntries: 10,
          lockAt: lock,
          featured: false,
          promotedUntil: null,
        },
      ],
    });

    const app = await createApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/leagues/browse?chainId=84532&entryToken=usdc&sort=poolWei&order=desc",
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body) as {
      data: { featured: { id: string; title: string }[]; leagues: { id: string; title: string }[] };
      meta: { total: number; featuredCount: number };
    };
    assert.equal(body.meta.total, 2);
    assert.equal(body.data.featured.length, 2);
    assert.equal(body.data.leagues.length, 0);
    const titles = body.data.featured.map((x) => x.title);
    assert.ok(titles.some((t) => t.includes("featured")));
    assert.ok(titles.some((t) => t.includes("promoted")));
    await app.close();
  },
);

test(
  "GET /api/v1/leagues/browse filters by fee range",
  { skip: !RUN },
  async () => {
    const lock = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.league.createMany({
      data: [
        {
          chainId: 84532,
          title: `${prefix} low fee`,
          entryTokenSymbol: "ETH",
          entryTokenAddress: "0x0000000000000000000000000000000000000000",
          entryFeeWei: 5n,
          poolWei: 1n,
          entryCount: 0,
          maxEntries: 10,
          lockAt: lock,
        },
        {
          chainId: 84532,
          title: `${prefix} high fee`,
          entryTokenSymbol: "ETH",
          entryTokenAddress: "0x0000000000000000000000000000000000000000",
          entryFeeWei: 500n,
          poolWei: 2n,
          entryCount: 0,
          maxEntries: 10,
          lockAt: lock,
        },
      ],
    });
    const app = await createApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/leagues/browse?minFeeWei=0&maxFeeWei=100",
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body) as { data: { leagues: { title: string }[] } };
    assert.equal(body.data.leagues.length, 1);
    assert.ok(body.data.leagues[0]!.title.includes("low fee"));
    await app.close();
  },
);
