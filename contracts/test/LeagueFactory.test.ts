import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deployLeagueFactory } from "./fixtures/index.js";

// Helper: build a valid LeagueParams tuple for tests.
// baseTimestamp should be the EVM's current block timestamp to keep lockTime in the future.
function makeValidParams(tokenAddress: `0x${string}`, baseTimestamp?: bigint) {
  const base = baseTimestamp ?? BigInt(Math.floor(Date.now() / 1000));
  return {
    token: tokenAddress,
    entryFee: 5_000_000_000_000_000_000n, // 5 tokens (18-decimal)
    maxEntries: 100n,
    maxEntriesPerWallet: 5n,
    minThreshold: 10n,
    revisionFee: 0n,
    revisionPolicy: 0,   // RevisionPolicy.Locked
    lockTime: base + 7n * 24n * 60n * 60n,
  } as const;
}

describe("LeagueFactory", () => {
  // ─── AC1: Happy-path league creation ────────────────────────────────────────

  it("createLeague deploys a League and emits LeagueCreated", async () => {
    const { leagueFactory, creator, token, creationFee, connection, latestTimestamp } =
      await deployLeagueFactory();
    const params = makeValidParams(token.address, latestTimestamp);

    const txHash = await leagueFactory.write.createLeague([params], {
      account: creator.account,
      value: creationFee,
    });

    const publicClient = await connection.viem.getPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    const events = await leagueFactory.getEvents.LeagueCreated(
      {},
      { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }
    );
    assert.equal(events.length, 1);
    assert.equal(
      events[0].args.creator?.toLowerCase(),
      creator.account.address.toLowerCase()
    );
    assert.ok(events[0].args.league, "league address should be set in event");
    assert.notEqual(
      events[0].args.league,
      "0x0000000000000000000000000000000000000000"
    );
  });

  it("deployed League address is a real contract with bytecode", async () => {
    const { leagueFactory, creator, token, creationFee, connection, latestTimestamp } =
      await deployLeagueFactory();
    const params = makeValidParams(token.address, latestTimestamp);

    const txHash = await leagueFactory.write.createLeague([params], {
      account: creator.account,
      value: creationFee,
    });

    const publicClient = await connection.viem.getPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    const events = await leagueFactory.getEvents.LeagueCreated(
      {},
      { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }
    );

    const leagueAddress = events[0].args.league as `0x${string}`;
    const bytecode = await publicClient.getBytecode({ address: leagueAddress });
    assert.ok(bytecode && bytecode.length > 2, "deployed League must have bytecode");
  });

  it("createLeague registers league in getLeagues", async () => {
    const { leagueFactory, creator, token, creationFee, latestTimestamp } = await deployLeagueFactory();
    const params = makeValidParams(token.address, latestTimestamp);

    await leagueFactory.write.createLeague([params], {
      account: creator.account,
      value: creationFee,
    });

    const leagues = await leagueFactory.read.getLeagues([0n, 10n]);
    assert.equal(leagues.length, 1);
    assert.notEqual(leagues[0], "0x0000000000000000000000000000000000000000");
  });

  it("creation fee is forwarded to devWallet in full", async () => {
    const { leagueFactory, creator, devWallet, token, creationFee, connection, latestTimestamp } =
      await deployLeagueFactory();
    const params = makeValidParams(token.address, latestTimestamp);

    const publicClient = await connection.viem.getPublicClient();
    const balanceBefore = await publicClient.getBalance({
      address: devWallet.account.address,
    });

    await leagueFactory.write.createLeague([params], {
      account: creator.account,
      value: creationFee,
    });

    const balanceAfter = await publicClient.getBalance({
      address: devWallet.account.address,
    });
    assert.equal(balanceAfter - balanceBefore, creationFee);
  });

  // ─── AC2: Non-whitelisted token reverts ─────────────────────────────────────

  it("createLeague reverts with TokenNotWhitelisted for non-whitelisted token", async () => {
    const { leagueFactory, creator, connection, creationFee } = await deployLeagueFactory();

    // Deploy a fresh MockERC20 that has NOT been approved in the WhitelistRegistry
    const unlisted = await connection.viem.deployContract("MockERC20", [
      "Unlisted",
      "UNL",
    ]);
    const params = makeValidParams(unlisted.address);

    await assert.rejects(
      leagueFactory.simulate.createLeague([params], {
        account: creator.account,
        value: creationFee,
      }),
      (err: Error) => err.message.includes("TokenNotWhitelisted")
    );
  });

  // ─── AC3: creationsPaused ────────────────────────────────────────────────────

  it("setCreationsPaused(true) emits CreationsPausedUpdated and blocks createLeague", async () => {
    const { leagueFactory, owner, creator, token, creationFee, connection } =
      await deployLeagueFactory();

    const txHash = await leagueFactory.write.setCreationsPaused([true], {
      account: owner.account,
    });
    const publicClient = await connection.viem.getPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    const events = await leagueFactory.getEvents.CreationsPausedUpdated(
      {},
      { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }
    );
    assert.equal(events.length, 1);
    assert.equal(events[0].args.paused, true);

    const params = makeValidParams(token.address);
    await assert.rejects(
      leagueFactory.simulate.createLeague([params], {
        account: creator.account,
        value: creationFee,
      }),
      (err: Error) => err.message.includes("CreationsPaused")
    );
  });

  it("setCreationsPaused(false) re-enables createLeague", async () => {
    const { leagueFactory, owner, creator, token, creationFee, latestTimestamp } =
      await deployLeagueFactory();

    await leagueFactory.write.setCreationsPaused([true], { account: owner.account });
    await leagueFactory.write.setCreationsPaused([false], { account: owner.account });

    const params = makeValidParams(token.address, latestTimestamp);
    // Should not throw
    await leagueFactory.write.createLeague([params], {
      account: creator.account,
      value: creationFee,
    });
    const leagues = await leagueFactory.read.getLeagues([0n, 5n]);
    assert.equal(leagues.length, 1);
  });

  // ─── AC4: setGlobalParams ────────────────────────────────────────────────────

  it("setGlobalParams updates storage and emits GlobalParamsUpdated", async () => {
    const { leagueFactory, owner, connection } = await deployLeagueFactory();

    const newDev = 300n;
    const newCap = 400n;
    const newMin = 2_000_000_000_000_000_000n; // 2 tokens

    const txHash = await leagueFactory.write.setGlobalParams(
      [newDev, newCap, newMin],
      { account: owner.account }
    );

    const publicClient = await connection.viem.getPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    const events = await leagueFactory.getEvents.GlobalParamsUpdated(
      {},
      { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }
    );
    assert.equal(events.length, 1);
    assert.equal(events[0].args.devFeeBps, newDev);
    assert.equal(events[0].args.creatorFeeCap, newCap);
    assert.equal(events[0].args.minEntryAmount, newMin);

    assert.equal(await leagueFactory.read.devFeeBps(), newDev);
    assert.equal(await leagueFactory.read.creatorFeeCap(), newCap);
    assert.equal(await leagueFactory.read.minEntryAmount(), newMin);
  });

  it("setGlobalParams reverts for non-owner with OwnableUnauthorizedAccount", async () => {
    const { leagueFactory, creator } = await deployLeagueFactory();

    await assert.rejects(
      leagueFactory.simulate.setGlobalParams([300n, 400n, 2_000_000_000_000_000_000n], {
        account: creator.account,
      }),
      (err: Error) => err.message.includes("OwnableUnauthorizedAccount")
    );
  });

  // ─── AC5: Pagination ─────────────────────────────────────────────────────────

  it("getLeagues returns correctly paginated slices", async () => {
    const { leagueFactory, creator, token, creationFee, latestTimestamp } = await deployLeagueFactory();
    const params = makeValidParams(token.address, latestTimestamp);

    // Create 3 leagues
    for (let i = 0; i < 3; i++) {
      await leagueFactory.write.createLeague([params], {
        account: creator.account,
        value: creationFee,
      });
    }

    const all = await leagueFactory.read.getLeagues([0n, 10n]);
    assert.equal(all.length, 3, "should return all 3 leagues");

    const page = await leagueFactory.read.getLeagues([1n, 1n]);
    assert.equal(page.length, 1);
    assert.equal(page[0].toLowerCase(), all[1].toLowerCase());

    const beyond = await leagueFactory.read.getLeagues([10n, 5n]);
    assert.equal(beyond.length, 0, "offset past end returns empty array");
  });

  // ─── Edge cases ──────────────────────────────────────────────────────────────

  it("createLeague reverts with InsufficientCreationFee when msg.value = 0", async () => {
    const { leagueFactory, creator, token } = await deployLeagueFactory();
    const params = makeValidParams(token.address);

    await assert.rejects(
      leagueFactory.simulate.createLeague([params], {
        account: creator.account,
        value: 0n,
      }),
      (err: Error) => err.message.includes("InsufficientCreationFee")
    );
  });

  it("createLeague reverts with InvalidParams when entryFee is zero", async () => {
    const { leagueFactory, creator, token, creationFee } = await deployLeagueFactory();
    const params = {
      ...makeValidParams(token.address),
      entryFee: 0n,
    } as const;

    await assert.rejects(
      leagueFactory.simulate.createLeague([params], {
        account: creator.account,
        value: creationFee,
      }),
      (err: Error) => err.message.includes("InvalidParams")
    );
  });

  it("constructor reverts with InvalidAddress when devWallet is zero address", async () => {
    const { connection, owner, whitelistRegistry, oracleController } =
      await deployLeagueFactory();
    const zeroAddress = "0x0000000000000000000000000000000000000000" as const;

    await assert.rejects(
      connection.viem.deployContract("LeagueFactory", [
        owner.account.address,
        whitelistRegistry.address,
        oracleController.address,
        zeroAddress, // devWallet = zero address
        0n,
        0n,
        0n,
        0n,
      ]),
      (err: Error) => err.message.includes("InvalidAddress")
    );
  });

  // ─── setWhitelistRegistry / setOracleController ──────────────────────────

  it("owner can update whitelistRegistry and event is emitted", async () => {
    const { leagueFactory, owner, connection } = await deployLeagueFactory();

    // Deploy a new registry as a stand-in replacement
    const newRegistry = await connection.viem.deployContract("WhitelistRegistry", [
      owner.account.address,
    ]);

    const txHash = await leagueFactory.write.setWhitelistRegistry(
      [newRegistry.address],
      { account: owner.account }
    );
    const publicClient = await connection.viem.getPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    const events = await leagueFactory.getEvents.WhitelistRegistryUpdated(
      {},
      { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }
    );
    assert.equal(events.length, 1);
    assert.equal(
      events[0].args.newRegistry?.toLowerCase(),
      newRegistry.address.toLowerCase()
    );
    assert.equal(
      (await leagueFactory.read.whitelistRegistry()).toLowerCase(),
      newRegistry.address.toLowerCase()
    );
  });

  it("setWhitelistRegistry reverts with InvalidAddress for zero address", async () => {
    const { leagueFactory, owner } = await deployLeagueFactory();
    const zeroAddress = "0x0000000000000000000000000000000000000000" as const;

    await assert.rejects(
      leagueFactory.simulate.setWhitelistRegistry([zeroAddress], { account: owner.account }),
      (err: Error) => err.message.includes("InvalidAddress")
    );
  });

  it("non-owner cannot call setWhitelistRegistry", async () => {
    const { leagueFactory, creator, whitelistRegistry } = await deployLeagueFactory();

    await assert.rejects(
      leagueFactory.simulate.setWhitelistRegistry(
        [whitelistRegistry.address],
        { account: creator.account }
      ),
      (err: Error) => err.message.includes("OwnableUnauthorizedAccount")
    );
  });

  it("owner can update oracleController and event is emitted", async () => {
    const { leagueFactory, owner, oracle, connection } = await deployLeagueFactory();

    // Deploy a new OracleController as a stand-in replacement
    const newOracle = await connection.viem.deployContract("OracleController", [
      owner.account.address,
      oracle.account.address,
      false,
    ]);

    const txHash = await leagueFactory.write.setOracleController(
      [newOracle.address],
      { account: owner.account }
    );
    const publicClient = await connection.viem.getPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    const events = await leagueFactory.getEvents.OracleControllerUpdated(
      {},
      { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }
    );
    assert.equal(events.length, 1);
    assert.equal(
      events[0].args.newOracle?.toLowerCase(),
      newOracle.address.toLowerCase()
    );
    assert.equal(
      (await leagueFactory.read.oracleController()).toLowerCase(),
      newOracle.address.toLowerCase()
    );
  });

  it("setOracleController reverts with InvalidAddress for zero address", async () => {
    const { leagueFactory, owner } = await deployLeagueFactory();
    const zeroAddress = "0x0000000000000000000000000000000000000000" as const;

    await assert.rejects(
      leagueFactory.simulate.setOracleController([zeroAddress], { account: owner.account }),
      (err: Error) => err.message.includes("InvalidAddress")
    );
  });

  it("non-owner cannot call setOracleController", async () => {
    const { leagueFactory, creator, oracleController } = await deployLeagueFactory();

    await assert.rejects(
      leagueFactory.simulate.setOracleController(
        [oracleController.address],
        { account: creator.account }
      ),
      (err: Error) => err.message.includes("OwnableUnauthorizedAccount")
    );
  });

  // ─── lockTime validation (D2) ─────────────────────────────────────────────

  it("createLeague reverts with InvalidParams when lockTime is 0", async () => {
    const { leagueFactory, creator, token, creationFee } = await deployLeagueFactory();
    const params = { ...makeValidParams(token.address), lockTime: 0n } as const;

    await assert.rejects(
      leagueFactory.simulate.createLeague([params], {
        account: creator.account,
        value: creationFee,
      }),
      (err: Error) => err.message.includes("InvalidParams")
    );
  });

  it("createLeague reverts with InvalidParams when lockTime is in the past", async () => {
    const { leagueFactory, creator, token, creationFee } = await deployLeagueFactory();
    // Use a timestamp well in the past (2020-01-01)
    const params = { ...makeValidParams(token.address), lockTime: 1577836800n } as const;

    await assert.rejects(
      leagueFactory.simulate.createLeague([params], {
        account: creator.account,
        value: creationFee,
      }),
      (err: Error) => err.message.includes("InvalidParams")
    );
  });

  // ─── setCreationFee event (BH-2 patch) ───────────────────────────────────

  it("setCreationFee updates storage and emits CreationFeeUpdated", async () => {
    const { leagueFactory, owner, connection } = await deployLeagueFactory();
    const newFee = 50_000_000_000_000_000n; // 0.05 ETH

    const txHash = await leagueFactory.write.setCreationFee([newFee], {
      account: owner.account,
    });
    const publicClient = await connection.viem.getPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    const events = await leagueFactory.getEvents.CreationFeeUpdated(
      {},
      { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }
    );
    assert.equal(events.length, 1);
    assert.equal(events[0].args.newFee, newFee);
    assert.equal(await leagueFactory.read.creationFee(), newFee);
  });
});
