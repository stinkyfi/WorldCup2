import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deployWhitelistRegistry } from "./fixtures/index.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
const ONE_HUNDRED_USDC_6 = 100n * 1_000_000n;

describe("WhitelistRegistry", () => {
  // ─── Epic 9 / Story 9.1: requestWhitelist ───────────────────────────────────

  describe("requestWhitelist", () => {
    it("transfers fee, records request, and emits WhitelistRequested", async () => {
      const { whitelistRegistry, tokenA, tokenB, owner, otherAccounts, connection } = await deployWhitelistRegistry();
      const requester = otherAccounts[0];

      // Configure fee token + amount (use tokenB as mock USDC).
      await whitelistRegistry.write.setRequestFee([tokenB.address, ONE_HUNDRED_USDC_6]);

      // Mint fee token to requester and approve registry for transferFrom.
      await tokenB.write.mint([requester.account.address, ONE_HUNDRED_USDC_6]);
      await tokenB.write.approve([whitelistRegistry.address, ONE_HUNDRED_USDC_6], { account: requester.account });

      const before = await tokenB.read.balanceOf([whitelistRegistry.address]);

      const txHash = await whitelistRegistry.write.requestWhitelist([tokenA.address], { account: requester.account });
      const publicClient = await connection.viem.getPublicClient();
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      const after = await tokenB.read.balanceOf([whitelistRegistry.address]);
      assert.equal(after - before, ONE_HUNDRED_USDC_6);

      const events = await whitelistRegistry.getEvents.WhitelistRequested(
        {},
        { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }
      );
      assert.equal(events.length, 1);
      assert.equal(events[0].args.token?.toLowerCase(), tokenA.address.toLowerCase());
      assert.equal(events[0].args.requester?.toLowerCase(), requester.account.address.toLowerCase());

      const req = await whitelistRegistry.read.requests([0n]);
      assert.equal(req[0].toLowerCase(), tokenA.address.toLowerCase()); // token
      assert.equal(req[1].toLowerCase(), requester.account.address.toLowerCase()); // requester
      assert.ok(BigInt(req[2]) > 0n, "requestedAt should be set"); // requestedAt

      // Owner is unused but ensures fixture sanity
      assert.ok(owner.account.address.length === 42);
    });

    it("reverts when token already whitelisted", async () => {
      const { whitelistRegistry, tokenA, tokenB, otherAccounts } = await deployWhitelistRegistry();
      const requester = otherAccounts[0];

      await whitelistRegistry.write.approveToken([tokenA.address]);
      await whitelistRegistry.write.setRequestFee([tokenB.address, ONE_HUNDRED_USDC_6]);
      await tokenB.write.mint([requester.account.address, ONE_HUNDRED_USDC_6]);
      await tokenB.write.approve([whitelistRegistry.address, ONE_HUNDRED_USDC_6], { account: requester.account });

      await assert.rejects(
        whitelistRegistry.simulate.requestWhitelist([tokenA.address], { account: requester.account }),
        (err: Error) => err.message.includes("TokenAlreadyWhitelisted")
      );
    });

    it("reverts when fee not configured", async () => {
      const { whitelistRegistry, tokenA, otherAccounts } = await deployWhitelistRegistry();
      const requester = otherAccounts[0];

      await assert.rejects(
        whitelistRegistry.simulate.requestWhitelist([tokenA.address], { account: requester.account }),
        (err: Error) => err.message.includes("RequestFeeNotConfigured")
      );
    });

    it("reverts on duplicate request for same token", async () => {
      const { whitelistRegistry, tokenA, tokenB, otherAccounts } = await deployWhitelistRegistry();
      const requester = otherAccounts[0];

      await whitelistRegistry.write.setRequestFee([tokenB.address, ONE_HUNDRED_USDC_6]);
      await tokenB.write.mint([requester.account.address, ONE_HUNDRED_USDC_6 * 2n]);
      await tokenB.write.approve([whitelistRegistry.address, ONE_HUNDRED_USDC_6 * 2n], { account: requester.account });

      await whitelistRegistry.write.requestWhitelist([tokenA.address], { account: requester.account });

      await assert.rejects(
        whitelistRegistry.simulate.requestWhitelist([tokenA.address], { account: requester.account }),
        (err: Error) => err.message.includes("TokenAlreadyRequested")
      );
    });
  });
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
