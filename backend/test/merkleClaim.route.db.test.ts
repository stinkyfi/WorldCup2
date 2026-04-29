import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { createApp } from "../src/createApp.js";
import { prisma } from "../src/db.js";

const RUN = Boolean(process.env.DATABASE_URL);
const prefix = "__merkle_claim_test__";

beforeEach(async () => {
  if (!RUN) return;
  const leagueAddrs = [
    "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "0xcccccccccccccccccccccccccccccccccccccccc",
  ].map((a) => a.toLowerCase());
  await prisma.merkleClaim.deleteMany({
    where: { chainId: 84532, leagueAddress: { in: leagueAddrs } },
  });
  await prisma.league.deleteMany({ where: { title: { startsWith: prefix } } });
});

test(
  "GET /api/v1/merkle-claim/prize returns proof when row exists",
  { skip: !RUN },
  async () => {
    const leagueAddr = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const wallet = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const proof = [`0x${"01".repeat(32)}` as const, `0x${"02".repeat(32)}` as const];
    await prisma.league.create({
      data: {
        chainId: 84532,
        title: `${prefix} league`,
        contractAddress: leagueAddr,
        entryTokenSymbol: "USDC",
        entryTokenDecimals: 6,
        entryFeeWei: 1_000_000n,
        poolWei: 1n,
        entryCount: 1,
        maxEntries: 10,
      },
    });
    await prisma.merkleClaim.create({
      data: {
        chainId: 84532,
        leagueAddress: leagueAddr.toLowerCase(),
        claimantAddress: wallet.toLowerCase(),
        amountWei: 5_000_000n,
        claimType: 0,
        proofJson: proof,
        leafHex: `0x${"cc".repeat(32)}`,
        merkleRootHex: `0x${"dd".repeat(32)}`,
      },
    });

    const app = await createApp();
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/merkle-claim/prize?chainId=84532&leagueAddress=${leagueAddr}&walletAddress=${wallet}`,
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body) as {
      data: {
        eligible: boolean;
        amountWei?: string;
        proof?: string[];
        entryTokenSymbol?: string;
      };
    };
    assert.equal(body.data.eligible, true);
    assert.equal(body.data.amountWei, "5000000");
    assert.deepEqual(body.data.proof, proof);
    assert.equal(body.data.entryTokenSymbol, "USDC");
    await app.close();
  },
);

test(
  "GET /api/v1/merkle-claim/prize returns eligible false without row",
  { skip: !RUN },
  async () => {
    const leagueAddr = "0xcccccccccccccccccccccccccccccccccccccccc";
    await prisma.league.create({
      data: {
        chainId: 84532,
        title: `${prefix} other`,
        contractAddress: leagueAddr,
        entryTokenSymbol: "ETH",
        entryTokenDecimals: 18,
        entryFeeWei: 1n,
        poolWei: 1n,
        entryCount: 1,
        maxEntries: 10,
      },
    });
    const app = await createApp();
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/merkle-claim/prize?chainId=84532&leagueAddress=${leagueAddr}&walletAddress=0xdddddddddddddddddddddddddddddddddddddddd`,
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body) as { data: { eligible: boolean; reason?: string } };
    assert.equal(body.data.eligible, false);
    assert.equal(body.data.reason, "NO_PRIZE_LEAF");
    await app.close();
  },
);
