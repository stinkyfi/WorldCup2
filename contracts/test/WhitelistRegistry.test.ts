import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deployWhitelistRegistry } from "./fixtures/index.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

describe("WhitelistRegistry", () => {
  // ─── AC1: Owner can approve a token ───────────────────────────────────────────

  describe("approveToken", () => {
    it("owner can approve a token — isWhitelisted returns true", async () => {
      const { whitelistRegistry, tokenA } = await deployWhitelistRegistry();

      await whitelistRegistry.write.approveToken([tokenA.address]);

      const listed = await whitelistRegistry.read.isWhitelisted([tokenA.address]);
      assert.equal(listed, true);
    });

    it("approveToken emits TokenApproved event", async () => {
      const { whitelistRegistry, tokenA, connection } = await deployWhitelistRegistry();

      const txHash = await whitelistRegistry.write.approveToken([tokenA.address]);
      const publicClient = await connection.viem.getPublicClient();
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      // Scope to the transaction's block to avoid cross-test event leakage
      const events = await whitelistRegistry.getEvents.TokenApproved(
        {},
        { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }
      );
      assert.ok(receipt.status === "success", "Transaction should succeed");
      assert.equal(events.length, 1, "Exactly one TokenApproved event should be emitted");
      assert.equal(events[0].args.token?.toLowerCase(), tokenA.address.toLowerCase());
    });

    it("approving an already-whitelisted token reverts with TokenAlreadyWhitelisted", async () => {
      const { whitelistRegistry, tokenA } = await deployWhitelistRegistry();

      await whitelistRegistry.write.approveToken([tokenA.address]);

      await assert.rejects(
        whitelistRegistry.simulate.approveToken([tokenA.address]),
        (err: Error) => err.message.includes("TokenAlreadyWhitelisted")
      );
    });

    it("approving zero address reverts with InvalidTokenAddress", async () => {
      const { whitelistRegistry } = await deployWhitelistRegistry();

      await assert.rejects(
        whitelistRegistry.simulate.approveToken([ZERO_ADDRESS]),
        (err: Error) => err.message.includes("InvalidTokenAddress")
      );
    });

    it("approving an EOA address reverts with InvalidTokenAddress", async () => {
      const { whitelistRegistry, otherAccounts } = await deployWhitelistRegistry();
      const eoa = otherAccounts[0].account.address;

      await assert.rejects(
        whitelistRegistry.simulate.approveToken([eoa]),
        (err: Error) => err.message.includes("InvalidTokenAddress")
      );
    });
  });

  // ─── AC2: Owner can remove a whitelisted token ────────────────────────────────

  describe("removeToken", () => {
    it("owner can remove a whitelisted token — isWhitelisted returns false", async () => {
      const { whitelistRegistry, tokenA } = await deployWhitelistRegistry();

      await whitelistRegistry.write.approveToken([tokenA.address]);
      await whitelistRegistry.write.removeToken([tokenA.address]);

      const listed = await whitelistRegistry.read.isWhitelisted([tokenA.address]);
      assert.equal(listed, false);
    });

    it("removeToken emits TokenRemoved event", async () => {
      const { whitelistRegistry, tokenA, connection } = await deployWhitelistRegistry();

      await whitelistRegistry.write.approveToken([tokenA.address]);
      const txHash = await whitelistRegistry.write.removeToken([tokenA.address]);
      const publicClient = await connection.viem.getPublicClient();
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      const events = await whitelistRegistry.getEvents.TokenRemoved(
        {},
        { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }
      );
      assert.equal(events.length, 1, "Exactly one TokenRemoved event should be emitted");
      assert.equal(events[0].args.token?.toLowerCase(), tokenA.address.toLowerCase());
    });

    it("removing a non-whitelisted token reverts with TokenNotWhitelisted", async () => {
      const { whitelistRegistry, tokenA } = await deployWhitelistRegistry();

      await assert.rejects(
        whitelistRegistry.simulate.removeToken([tokenA.address]),
        (err: Error) => err.message.includes("TokenNotWhitelisted")
      );
    });
  });

  // ─── AC3: Non-owner cannot call approveToken or removeToken ──────────────────

  describe("access control", () => {
    it("non-owner cannot approve a token — reverts with OwnableUnauthorizedAccount", async () => {
      const { whitelistRegistry, tokenA, otherAccounts } = await deployWhitelistRegistry();
      const attacker = otherAccounts[0];

      await assert.rejects(
        whitelistRegistry.simulate.approveToken([tokenA.address], {
          account: attacker.account,
        }),
        (err: Error) => err.message.includes("OwnableUnauthorizedAccount")
      );
    });

    it("non-owner cannot remove a token — reverts with OwnableUnauthorizedAccount", async () => {
      const { whitelistRegistry, tokenA, otherAccounts } = await deployWhitelistRegistry();
      const attacker = otherAccounts[0];

      // Approve as owner first so the token exists
      await whitelistRegistry.write.approveToken([tokenA.address]);

      await assert.rejects(
        whitelistRegistry.simulate.removeToken([tokenA.address], {
          account: attacker.account,
        }),
        (err: Error) => err.message.includes("OwnableUnauthorizedAccount")
      );
    });
  });

  // ─── AC4: getWhitelistedTokens returns all whitelisted tokens ───────────────────────────

  describe("getWhitelistedTokens", () => {
    it("returns empty array when no tokens whitelisted", async () => {
      const { whitelistRegistry } = await deployWhitelistRegistry();

      const tokens = await whitelistRegistry.read.getWhitelistedTokens();
      assert.deepEqual(tokens, []);
    });

    it("returns all approved tokens", async () => {
      const { whitelistRegistry, tokenA, tokenB } = await deployWhitelistRegistry();

      await whitelistRegistry.write.approveToken([tokenA.address]);
      await whitelistRegistry.write.approveToken([tokenB.address]);

      const tokens = await whitelistRegistry.read.getWhitelistedTokens();
      assert.equal(tokens.length, 2);
      // EnumerableSet order is not guaranteed — check membership
      const lower = tokens.map((t: string) => t.toLowerCase());
      assert.ok(lower.includes(tokenA.address.toLowerCase()), "tokenA should be in list");
      assert.ok(lower.includes(tokenB.address.toLowerCase()), "tokenB should be in list");
    });

    it("does not return removed tokens", async () => {
      const { whitelistRegistry, tokenA, tokenB } = await deployWhitelistRegistry();

      await whitelistRegistry.write.approveToken([tokenA.address]);
      await whitelistRegistry.write.approveToken([tokenB.address]);
      await whitelistRegistry.write.removeToken([tokenA.address]);

      const tokens = await whitelistRegistry.read.getWhitelistedTokens();
      assert.equal(tokens.length, 1);
      assert.equal(tokens[0].toLowerCase(), tokenB.address.toLowerCase());
    });
  });
});
