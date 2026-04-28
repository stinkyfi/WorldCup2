import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deployOracleController, deployOracleControllerStaging } from "./fixtures/index.js";

// Helper: build a 4-address ranking tuple from an array of wallet clients
function makeRankings(accounts: { account: { address: `0x${string}` } }[]) {
  return [
    accounts[0].account.address,
    accounts[1].account.address,
    accounts[2].account.address,
    accounts[3].account.address,
  ] as const;
}

describe("OracleController", () => {

  // ─── AC1: Oracle can post results ────────────────────────────────────────────

  describe("postResults", () => {
    it("oracle can post results — getResults returns correct rankings", async () => {
      const { oracleController, oracle, otherAccounts } = await deployOracleController();
      const rankings = makeRankings(otherAccounts);

      await oracleController.write.postResults([0, rankings], { account: oracle.account });

      const stored = await oracleController.read.getResults([0]);
      assert.deepEqual(
        stored.map((a: string) => a.toLowerCase()),
        rankings.map(a => a.toLowerCase())
      );
    });

    it("postResults emits ResultsPosted event", async () => {
      const { oracleController, oracle, otherAccounts, connection } = await deployOracleController();
      const rankings = makeRankings(otherAccounts);

      const txHash = await oracleController.write.postResults([0, rankings], { account: oracle.account });
      const publicClient = await connection.viem.getPublicClient();
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      const events = await oracleController.getEvents.ResultsPosted(
        {},
        { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }
      );
      assert.equal(events.length, 1, "Exactly one ResultsPosted event should be emitted");
      assert.equal(events[0].args.groupId, 0);
      assert.deepEqual(
        events[0].args.rankings?.map((a: string) => a.toLowerCase()),
        rankings.map(a => a.toLowerCase())
      );
    });

    // ─── AC2: Idempotency — same data ───────────────────────────────────────────

    it("posting identical results again succeeds silently (idempotent — safe for redundant cron)", async () => {
      const { oracleController, oracle, otherAccounts } = await deployOracleController();
      const rankings = makeRankings(otherAccounts);

      await oracleController.write.postResults([0, rankings], { account: oracle.account });
      // Second identical post — must not throw
      await oracleController.write.postResults([0, rankings], { account: oracle.account });

      const stored = await oracleController.read.getResults([0]);
      assert.deepEqual(
        stored.map((a: string) => a.toLowerCase()),
        rankings.map(a => a.toLowerCase())
      );
    });

    // ─── AC2: Idempotency — conflicting data ────────────────────────────────────

    it("posting conflicting results for same group reverts with ResultsAlreadyPosted", async () => {
      const { oracleController, oracle, otherAccounts } = await deployOracleController();
      const rankings1 = makeRankings(otherAccounts);
      // Different order — conflict
      const rankings2 = [
        otherAccounts[3].account.address,
        otherAccounts[2].account.address,
        otherAccounts[1].account.address,
        otherAccounts[0].account.address,
      ] as const;

      await oracleController.write.postResults([0, rankings1], { account: oracle.account });

      await assert.rejects(
        oracleController.simulate.postResults([0, rankings2], { account: oracle.account }),
        (err: Error) => err.message.includes("ResultsAlreadyPosted")
      );
    });

    // ─── AC6: Non-oracle cannot post ────────────────────────────────────────────

    it("non-oracle address calling postResults reverts with UnauthorisedOracle", async () => {
      const { oracleController, otherAccounts } = await deployOracleController();
      const rankings = makeRankings(otherAccounts);
      const attacker = otherAccounts[0];

      await assert.rejects(
        oracleController.simulate.postResults([0, rankings], { account: attacker.account }),
        (err: Error) => err.message.includes("UnauthorisedOracle")
      );
    });

    it("owner can post results (admin/manual fallback) — getResults returns correct rankings", async () => {
      const { oracleController, owner, otherAccounts } = await deployOracleController();
      const rankings = makeRankings(otherAccounts);

      await oracleController.write.postResults([1, rankings], { account: owner.account });

      const stored = await oracleController.read.getResults([1]);
      assert.deepEqual(
        stored.map((a: string) => a.toLowerCase()),
        rankings.map(a => a.toLowerCase())
      );
    });
  });

  // ─── hasResultsPosted ────────────────────────────────────────────────────────

  describe("hasResultsPosted", () => {
    it("returns false before results are posted", async () => {
      const { oracleController } = await deployOracleController();
      const posted = await oracleController.read.hasResultsPosted([0]);
      assert.equal(posted, false);
    });

    it("returns true after results are posted", async () => {
      const { oracleController, oracle, otherAccounts } = await deployOracleController();
      const rankings = makeRankings(otherAccounts);

      await oracleController.write.postResults([0, rankings], { account: oracle.account });

      const posted = await oracleController.read.hasResultsPosted([0]);
      assert.equal(posted, true);
    });
  });

  // ─── D2: getResults reverts for unposted groups (ResultsNotPosted) ────────────

  describe("getResults", () => {
    it("getResults reverts with ResultsNotPosted when no results have been posted", async () => {
      const { oracleController } = await deployOracleController();

      await assert.rejects(
        oracleController.simulate.getResults([0]),
        (err: Error) => err.message.includes("ResultsNotPosted")
      );
    });

    it("getResults succeeds after results are posted", async () => {
      const { oracleController, oracle, otherAccounts } = await deployOracleController();
      const rankings = makeRankings(otherAccounts);

      await oracleController.write.postResults([0, rankings], { account: oracle.account });

      // Must not revert
      const stored = await oracleController.read.getResults([0]);
      assert.deepEqual(
        stored.map((a: string) => a.toLowerCase()),
        rankings.map(a => a.toLowerCase())
      );
    });
  });

  // ─── D1: oracle rotation (setOracle) ────────────────────────────────────────

  describe("setOracle", () => {
    it("owner can rotate the oracle address", async () => {
      const { oracleController, otherAccounts } = await deployOracleController();
      const newOracle = otherAccounts[0].account.address;

      await oracleController.write.setOracle([newOracle]);

      const stored = await oracleController.read.oracle();
      assert.equal(stored.toLowerCase(), newOracle.toLowerCase());
    });

    it("new oracle can post results after rotation", async () => {
      const { oracleController, otherAccounts } = await deployOracleController();
      const newOracle = otherAccounts[0];
      const rankings = makeRankings(otherAccounts);

      await oracleController.write.setOracle([newOracle.account.address]);
      await oracleController.write.postResults([0, rankings], { account: newOracle.account });

      const posted = await oracleController.read.hasResultsPosted([0]);
      assert.equal(posted, true);
    });

    it("setOracle with zero address reverts with InvalidAddress", async () => {
      const { oracleController } = await deployOracleController();

      await assert.rejects(
        oracleController.simulate.setOracle(["0x0000000000000000000000000000000000000000"]),
        (err: Error) => err.message.includes("InvalidAddress")
      );
    });

    it("non-owner cannot call setOracle — reverts with OwnableUnauthorizedAccount", async () => {
      const { oracleController, otherAccounts } = await deployOracleController();
      const attacker = otherAccounts[0];

      await assert.rejects(
        oracleController.simulate.setOracle([otherAccounts[1].account.address], { account: attacker.account }),
        (err: Error) => err.message.includes("OwnableUnauthorizedAccount")
      );
    });
  });

  // ─── B4: Zero-address oracle at deploy reverts with InvalidAddress ────────────

  describe("constructor guards", () => {
    it("deploying with zero oracle address reverts with InvalidAddress", async () => {
      const connection = await (await import("hardhat")).default.network.getOrCreate();
      const [owner] = await connection.viem.getWalletClients();

      await assert.rejects(
        connection.viem.deployContract("OracleController", [
          owner.account.address,
          "0x0000000000000000000000000000000000000000",
          false,
        ]),
        (err: Error) => err.message.includes("InvalidAddress")
      );
    });
  });

  // ─── AC3 & AC4: setResultsForTesting (staging mode) ─────────────────────────

  describe("setResultsForTesting", () => {
    it("staging: setResultsForTesting sets results without oracle auth", async () => {
      const { oracleController, otherAccounts } = await deployOracleControllerStaging();
      const rankings = makeRankings(otherAccounts);

      // Any account can call this in staging — use owner (implicit default)
      await oracleController.write.setResultsForTesting([1, rankings]);

      const stored = await oracleController.read.getResults([1]);
      assert.deepEqual(
        stored.map((a: string) => a.toLowerCase()),
        rankings.map(a => a.toLowerCase())
      );
    });

    it("staging: setResultsForTesting emits ResultsPosted event", async () => {
      const { oracleController, otherAccounts, connection } = await deployOracleControllerStaging();
      const rankings = makeRankings(otherAccounts);

      const txHash = await oracleController.write.setResultsForTesting([2, rankings]);
      const publicClient = await connection.viem.getPublicClient();
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      const events = await oracleController.getEvents.ResultsPosted(
        {},
        { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }
      );
      assert.equal(events.length, 1);
      assert.equal(events[0].args.groupId, 2);
    });

    it("production: setResultsForTesting reverts with NotStagingMode", async () => {
      const { oracleController, otherAccounts } = await deployOracleController();
      const rankings = makeRankings(otherAccounts);

      await assert.rejects(
        oracleController.simulate.setResultsForTesting([0, rankings]),
        (err: Error) => err.message.includes("NotStagingMode")
      );
    });
  });

  // ─── AC5: Grace period extension ─────────────────────────────────────────────

  describe("extendGracePeriod", () => {
    it("owner can set initial deadline and extend grace period", async () => {
      const { oracleController } = await deployOracleController();
      const initialDeadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

      await oracleController.write.setGroupDeadline([0, initialDeadline]);
      assert.equal(await oracleController.read.expectedDeadline([0]), initialDeadline);

      const additionalSeconds = BigInt(7200); // +2 hours
      await oracleController.write.extendGracePeriod([0, additionalSeconds]);

      const newDeadline = await oracleController.read.expectedDeadline([0]);
      assert.equal(newDeadline, initialDeadline + additionalSeconds);
    });

    it("extendGracePeriod emits GracePeriodExtended event", async () => {
      const { oracleController, connection } = await deployOracleController();
      const initialDeadline = BigInt(1000000);
      const additionalSeconds = BigInt(3600);

      await oracleController.write.setGroupDeadline([0, initialDeadline]);
      const txHash = await oracleController.write.extendGracePeriod([0, additionalSeconds]);
      const publicClient = await connection.viem.getPublicClient();
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      const events = await oracleController.getEvents.GracePeriodExtended(
        {},
        { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }
      );
      assert.equal(events.length, 1);
      assert.equal(events[0].args.groupId, 0);
      assert.equal(events[0].args.newDeadline, initialDeadline + additionalSeconds);
    });

    it("non-owner calling extendGracePeriod reverts with OwnableUnauthorizedAccount", async () => {
      const { oracleController, otherAccounts } = await deployOracleController();
      const attacker = otherAccounts[0];

      await assert.rejects(
        oracleController.simulate.extendGracePeriod([0, BigInt(3600)], { account: attacker.account }),
        (err: Error) => err.message.includes("OwnableUnauthorizedAccount")
      );
    });

    it("non-owner calling setGroupDeadline reverts with OwnableUnauthorizedAccount", async () => {
      const { oracleController, otherAccounts } = await deployOracleController();
      const attacker = otherAccounts[0];

      await assert.rejects(
        oracleController.simulate.setGroupDeadline([0, BigInt(1000000)], { account: attacker.account }),
        (err: Error) => err.message.includes("OwnableUnauthorizedAccount")
      );
    });
  });
});
