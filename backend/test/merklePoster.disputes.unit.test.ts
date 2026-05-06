import assert from "node:assert/strict";
import { test } from "node:test";
import type { Address } from "viem";
import { hasAnyUnsettledDispute } from "../src/indexer/merklePoster.js";

const leagueAddr = "0x1111111111111111111111111111111111111111" as Address;

test("hasAnyUnsettledDispute: disputes disabled => false", async () => {
  const publicClient = {
    readContract: async ({ functionName }: { functionName: string }) => {
      if (functionName === "disputeDepositToken") return "0x0000000000000000000000000000000000000000";
      throw new Error(`unexpected functionName: ${functionName}`);
    },
  } as any;

  const res = await hasAnyUnsettledDispute(publicClient, leagueAddr);
  assert.equal(res, false);
});

test("hasAnyUnsettledDispute: disputes enabled but count=0 => false", async () => {
  const publicClient = {
    readContract: async ({ functionName }: { functionName: string }) => {
      if (functionName === "disputeDepositToken") return "0x2222222222222222222222222222222222222222";
      if (functionName === "disputeCount") return 0n;
      throw new Error(`unexpected functionName: ${functionName}`);
    },
  } as any;

  const res = await hasAnyUnsettledDispute(publicClient, leagueAddr);
  assert.equal(res, false);
});

test("hasAnyUnsettledDispute: any unsettled dispute => true", async () => {
  const disputes: Array<readonly [Address, number, boolean, boolean]> = [
    ["0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", 0, false, true],
    ["0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", 1, false, false],
  ];

  const publicClient = {
    readContract: async ({ functionName, args }: { functionName: string; args?: unknown[] }) => {
      if (functionName === "disputeDepositToken") return "0x2222222222222222222222222222222222222222";
      if (functionName === "disputeCount") return BigInt(disputes.length);
      if (functionName === "disputeAt") {
        const i = Number(args?.[0] ?? -1);
        return disputes[i]!;
      }
      throw new Error(`unexpected functionName: ${functionName}`);
    },
  } as any;

  const res = await hasAnyUnsettledDispute(publicClient, leagueAddr);
  assert.equal(res, true);
});

test("hasAnyUnsettledDispute: read failure => true (conservative)", async () => {
  const publicClient = {
    readContract: async () => {
      throw new Error("rpc down");
    },
  } as any;

  const res = await hasAnyUnsettledDispute(publicClient, leagueAddr);
  assert.equal(res, true);
});

