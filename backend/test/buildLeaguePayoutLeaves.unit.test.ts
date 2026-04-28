import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getAddress } from "viem";
import { buildLeaguePayoutLeaves } from "../src/indexer/buildLeaguePayoutLeaves.js";

describe("buildLeaguePayoutLeaves", () => {
  it("splits prize pool across ranks and merges fee recipients when creator == devWallet", () => {
    const entryFeeWei = 10_000n;
    const entryCount = 2;

    const creator = getAddress("0xcafebabecafebabecafebabecafebabecafebabe");
    const dev = creator;

    const rows = [
      { walletAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", rank: 1 },
      { walletAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", rank: 2 },
    ];

    const leaves = buildLeaguePayoutLeaves({
      prizeRankLimit: 10,
      leaderboardRows: rows,
      entryFeeWei,
      entryCount,
      creatorFeeBps: 300,
      devFeeBps: 200,
      creatorAddress: creator,
      devWalletAddress: dev,
    });

    let prizeSum = 0n;
    let feeSum = 0n;
    for (const l of leaves) {
      if (l.claimType === 0) prizeSum += l.amountWei;
      else feeSum += l.amountWei;
    }

    assert.equal(prizeSum + feeSum, entryFeeWei * BigInt(entryCount));

    const feeLeaves = leaves.filter((l) => l.claimType === 1);
    assert.equal(feeLeaves.length, 1);
    assert.equal(feeLeaves[0]!.claimant.toLowerCase(), creator.toLowerCase());
  });
});
