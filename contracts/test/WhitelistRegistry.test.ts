import { describe, it } from "node:test";
import assert from "node:assert/strict";
import hre from "hardhat";
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
      assert.equal(Number(req[3]), 0); // status Pending
      assert.equal(BigInt(req[4]), ONE_HUNDRED_USDC_6); // feeEscrowed

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

  describe("vote", () => {
    it("records an upvote and blocks double-voting", async () => {
      const { whitelistRegistry, tokenA, tokenB, otherAccounts } = await deployWhitelistRegistry();
      const voter = otherAccounts[0];

      await whitelistRegistry.write.setRequestFee([tokenB.address, ONE_HUNDRED_USDC_6]);
      await tokenB.write.mint([voter.account.address, ONE_HUNDRED_USDC_6]);
      await tokenB.write.approve([whitelistRegistry.address, ONE_HUNDRED_USDC_6], { account: voter.account });
      await whitelistRegistry.write.requestWhitelist([tokenA.address], { account: voter.account });

      await whitelistRegistry.write.vote([0n, true], { account: voter.account });
      const up = await whitelistRegistry.read.upvotes([0n]);
      const down = await whitelistRegistry.read.downvotes([0n]);
      const choice = await whitelistRegistry.read.voteOf([0n, voter.account.address]);
      assert.equal(up, 1n);
      assert.equal(down, 0n);
      assert.equal(Number(choice), 1);

      await assert.rejects(
        whitelistRegistry.simulate.vote([0n, true], { account: voter.account }),
        (err: Error) => err.message.includes("AlreadyVoted")
      );
    });

    it("records a downvote", async () => {
      const { whitelistRegistry, tokenA, tokenB, otherAccounts } = await deployWhitelistRegistry();
      const voter = otherAccounts[0];

      await whitelistRegistry.write.setRequestFee([tokenB.address, ONE_HUNDRED_USDC_6]);
      await tokenB.write.mint([voter.account.address, ONE_HUNDRED_USDC_6]);
      await tokenB.write.approve([whitelistRegistry.address, ONE_HUNDRED_USDC_6], { account: voter.account });
      await whitelistRegistry.write.requestWhitelist([tokenA.address], { account: voter.account });

      await whitelistRegistry.write.vote([0n, false], { account: voter.account });
      const up = await whitelistRegistry.read.upvotes([0n]);
      const down = await whitelistRegistry.read.downvotes([0n]);
      const choice = await whitelistRegistry.read.voteOf([0n, voter.account.address]);
      assert.equal(up, 0n);
      assert.equal(down, 1n);
      assert.equal(Number(choice), 2);
    });

    it("reverts with RequestNotPending after request is approved", async () => {
      const { whitelistRegistry, tokenA, tokenB, owner, otherAccounts } = await deployWhitelistRegistry();
      const requester = otherAccounts[0];
      const voter = otherAccounts[1];

      await whitelistRegistry.write.setRequestFee([tokenB.address, ONE_HUNDRED_USDC_6]);
      await tokenB.write.mint([requester.account.address, ONE_HUNDRED_USDC_6]);
      await tokenB.write.approve([whitelistRegistry.address, ONE_HUNDRED_USDC_6], { account: requester.account });
      await whitelistRegistry.write.requestWhitelist([tokenA.address], { account: requester.account });
      await whitelistRegistry.write.approveRequest([0n], { account: owner.account });

      await assert.rejects(
        whitelistRegistry.simulate.vote([0n, true], { account: voter.account }),
        (err: Error) => err.message.includes("RequestNotPending"),
      );
    });

    it("reverts with RequestNotPending after request is rejected", async () => {
      const { whitelistRegistry, tokenA, tokenB, owner, otherAccounts } = await deployWhitelistRegistry();
      const requester = otherAccounts[0];
      const voter = otherAccounts[1];

      await whitelistRegistry.write.setRequestFee([tokenB.address, ONE_HUNDRED_USDC_6]);
      await tokenB.write.mint([requester.account.address, ONE_HUNDRED_USDC_6]);
      await tokenB.write.approve([whitelistRegistry.address, ONE_HUNDRED_USDC_6], { account: requester.account });
      await whitelistRegistry.write.requestWhitelist([tokenA.address], { account: requester.account });
      await whitelistRegistry.write.rejectRequest([0n], { account: owner.account });

      await assert.rejects(
        whitelistRegistry.simulate.vote([0n, false], { account: voter.account }),
        (err: Error) => err.message.includes("RequestNotPending"),
      );
    });
  });

  describe("approveRequest / rejectRequest (Story 9.3)", () => {
    it("approveRequest whitelists token and clears pending", async () => {
      const { whitelistRegistry, tokenA, tokenB, owner, otherAccounts } = await deployWhitelistRegistry();
      const requester = otherAccounts[0];
      await whitelistRegistry.write.setRequestFee([tokenB.address, ONE_HUNDRED_USDC_6]);
      await tokenB.write.mint([requester.account.address, ONE_HUNDRED_USDC_6]);
      await tokenB.write.approve([whitelistRegistry.address, ONE_HUNDRED_USDC_6], { account: requester.account });
      await whitelistRegistry.write.requestWhitelist([tokenA.address], { account: requester.account });

      await whitelistRegistry.write.approveRequest([0n], { account: owner.account });
      assert.equal(await whitelistRegistry.read.isWhitelisted([tokenA.address]), true);
      assert.equal(await whitelistRegistry.read.hasPendingRequest([tokenA.address]), false);
      const req = await whitelistRegistry.read.requests([0n]);
      assert.equal(Number(req[3]), 1); // Approved
    });

    it("rejectRequest refunds escrow and emits TokenRejected", async () => {
      const { whitelistRegistry, tokenA, tokenB, owner, otherAccounts, connection } = await deployWhitelistRegistry();
      const requester = otherAccounts[0];
      await whitelistRegistry.write.setRequestFee([tokenB.address, ONE_HUNDRED_USDC_6]);
      await tokenB.write.mint([requester.account.address, ONE_HUNDRED_USDC_6]);
      await tokenB.write.approve([whitelistRegistry.address, ONE_HUNDRED_USDC_6], { account: requester.account });
      await whitelistRegistry.write.requestWhitelist([tokenA.address], { account: requester.account });

      const rbBefore = await tokenB.read.balanceOf([requester.account.address]);

      const txHash = await whitelistRegistry.write.rejectRequest([0n], { account: owner.account });
      const publicClient = await connection.viem.getPublicClient();
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      const events = await whitelistRegistry.getEvents.TokenRejected(
        {},
        { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }
      );
      assert.equal(events.length, 1);
      assert.equal(events[0].args.refundAmount, ONE_HUNDRED_USDC_6);

      const rbAfter = await tokenB.read.balanceOf([requester.account.address]);
      assert.equal(rbAfter - rbBefore, ONE_HUNDRED_USDC_6);
      assert.equal(await whitelistRegistry.read.hasPendingRequest([tokenA.address]), false);
      const req = await whitelistRegistry.read.requests([0n]);
      assert.equal(Number(req[3]), 2); // Rejected
    });

    it("rejectRequest refunds fee-on-transfer fee token escrow without revert", async () => {
      const connection = await hre.network.getOrCreate();
      const [owner, ...rest] = await connection.viem.getWalletClients();

      const feeTok = await connection.viem.deployContract("FeeOnTransferERC20", [
        "Fee USDC",
        "FUSDC",
        1234n,
      ]);
      const targetTok = await connection.viem.deployContract("MockERC20", ["Nominated", "NOM"]);

      const registry = await connection.viem.deployContract("WhitelistRegistry", [owner.account.address]);
      await registry.write.setRequestFee([feeTok.address, 1_000_000_000_000_000_000n], { account: owner.account }); // 1e18 nominal

      const requester = rest[0];
      await feeTok.write.mint([requester.account.address, 10n * 10n ** 18n]);
      await feeTok.write.approve([registry.address, 10n ** 18n], { account: requester.account });
      await registry.write.requestWhitelist([targetTok.address], { account: requester.account });

      const escrowRow = await registry.read.requests([0n]);
      const escrow = escrowRow[4] as bigint;
      assert.ok(escrow <= 10n ** 18n);
      assert.ok(escrow < 10n ** 18n, "deposit should retain less than nominal due to FoT");

      const regBalEscrow = await feeTok.read.balanceOf([registry.address]);
      assert.equal(regBalEscrow, escrow);

      const balBeforeReject = await feeTok.read.balanceOf([requester.account.address]);
      await registry.write.rejectRequest([0n], { account: owner.account });
      const balAfterReject = await feeTok.read.balanceOf([requester.account.address]);

      assert.equal(await feeTok.read.balanceOf([registry.address]), 0n);
      const refunded = balAfterReject - balBeforeReject;
      assert.ok(refunded > 0n && refunded <= escrow, "Outbound transfer may shave another FoT slice");
    });

    it("non-owner cannot approveRequest — OwnableUnauthorizedAccount", async () => {
      const { whitelistRegistry, tokenA, tokenB, owner, otherAccounts } = await deployWhitelistRegistry();
      const requester = otherAccounts[0];
      const attacker = otherAccounts[1];

      await whitelistRegistry.write.setRequestFee([tokenB.address, ONE_HUNDRED_USDC_6]);
      await tokenB.write.mint([requester.account.address, ONE_HUNDRED_USDC_6]);
      await tokenB.write.approve([whitelistRegistry.address, ONE_HUNDRED_USDC_6], { account: requester.account });
      await whitelistRegistry.write.requestWhitelist([tokenA.address], { account: requester.account });

      assert.ok(owner.account.address !== attacker.account.address);

      await assert.rejects(
        whitelistRegistry.simulate.approveRequest([0n], { account: attacker.account }),
        (err: Error) => err.message.includes("OwnableUnauthorizedAccount"),
      );
    });

    it("rejectRequest twice reverts RequestNotPending", async () => {
      const { whitelistRegistry, tokenA, tokenB, owner, otherAccounts } = await deployWhitelistRegistry();
      const requester = otherAccounts[0];

      await whitelistRegistry.write.setRequestFee([tokenB.address, ONE_HUNDRED_USDC_6]);
      await tokenB.write.mint([requester.account.address, ONE_HUNDRED_USDC_6]);
      await tokenB.write.approve([whitelistRegistry.address, ONE_HUNDRED_USDC_6], { account: requester.account });
      await whitelistRegistry.write.requestWhitelist([tokenA.address], { account: requester.account });

      await whitelistRegistry.write.rejectRequest([0n], { account: owner.account });

      await assert.rejects(
        whitelistRegistry.simulate.rejectRequest([0n], { account: owner.account }),
        (err: Error) => err.message.includes("RequestNotPending"),
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

    it("reverts TokenHasPendingWhitelistRequest when a pending queue entry exists", async () => {
      const { whitelistRegistry, tokenA, tokenB, otherAccounts } = await deployWhitelistRegistry();
      const requester = otherAccounts[0];

      await whitelistRegistry.write.setRequestFee([tokenB.address, ONE_HUNDRED_USDC_6]);
      await tokenB.write.mint([requester.account.address, ONE_HUNDRED_USDC_6]);
      await tokenB.write.approve([whitelistRegistry.address, ONE_HUNDRED_USDC_6], { account: requester.account });
      await whitelistRegistry.write.requestWhitelist([tokenA.address], { account: requester.account });

      await assert.rejects(
        whitelistRegistry.simulate.approveToken([tokenA.address]),
        (err: Error) => err.message.includes("TokenHasPendingWhitelistRequest"),
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
