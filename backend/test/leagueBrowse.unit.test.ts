import assert from "node:assert/strict";
import { test } from "node:test";
import type { League } from "@prisma/client";
import {
  buildLeagueBrowseWhere,
  isSpotlightLeague,
  partitionBrowseRows,
  sortMain,
} from "../src/lib/leagueBrowse.js";

function row(p: Partial<League> & Pick<League, "id" | "title" | "chainId">): League {
  return {
    createdAt: new Date("2024-01-01T12:00:00Z"),
    updatedAt: new Date("2024-01-01T12:00:00Z"),
    contractAddress: null,
    entryTokenAddress: "0x0000000000000000000000000000000000000000",
    entryTokenSymbol: "ETH",
    entryFeeWei: 0n,
    poolWei: 0n,
    entryCount: 0,
    maxEntries: 1000,
    lockAt: new Date("2030-01-01T00:00:00Z"),
    featured: false,
    promotedUntil: null,
    ...p,
  };
}

test("isSpotlightLeague: featured true", () => {
  assert.equal(isSpotlightLeague({ featured: true, promotedUntil: null }), true);
});

test("isSpotlightLeague: promotedUntil in future", () => {
  const future = new Date(Date.now() + 86_400_000);
  assert.equal(isSpotlightLeague({ featured: false, promotedUntil: future }), true);
});

test("isSpotlightLeague: promotedUntil in past", () => {
  const past = new Date(Date.now() - 86_400_000);
  assert.equal(isSpotlightLeague({ featured: false, promotedUntil: past }), false);
});

test("partitionBrowseRows excludes spotlight from main grid", () => {
  const a = row({ id: "a", title: "A", chainId: 1, featured: true });
  const b = row({ id: "b", title: "B", chainId: 1, poolWei: 5n });
  const { featured, leagues } = partitionBrowseRows([a, b], "poolWei", "desc");
  assert.equal(featured.length, 1);
  assert.equal(featured[0]!.id, "a");
  assert.equal(leagues.length, 1);
  assert.equal(leagues[0]!.id, "b");
});

test("sortMain by poolWei desc", () => {
  const low = row({ id: "l", title: "L", chainId: 1, poolWei: 1n });
  const high = row({ id: "h", title: "H", chainId: 1, poolWei: 99n });
  const sorted = sortMain([low, high], "poolWei", "desc");
  assert.deepEqual(sorted.map((x) => x.id), ["h", "l"]);
});

test("buildLeagueBrowseWhere composes chain and entry token address", () => {
  const w = buildLeagueBrowseWhere({
    chainId: 84532,
    entryToken: "0x1111111111111111111111111111111111111111",
  });
  assert.ok("AND" in w && Array.isArray(w.AND));
  assert.equal(w.AND?.length, 2);
});
