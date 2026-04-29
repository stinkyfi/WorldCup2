import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { keccak256, encodePacked, getEventSelector } from "viem";
import hre from "hardhat";
import { deployLeague, LEAGUE_DISPUTE_DISABLED } from "./fixtures/index.js";

// ─── Merkle helpers ──────────────────────────────────────────────────────────
// OZ MerkleProof.verify uses sorted-pair hashing (smaller sibling first).
// We build minimal 2-leaf trees in tests.

type Hex = `0x${string}`;

function makeLeaf(address: Hex, amount: bigint, claimType: 0 | 1): Hex {
  return keccak256(encodePacked(["address", "uint256", "uint8"], [address, amount, claimType]));
}

function sortedHash(a: Hex, b: Hex): Hex {
  return a < b
    ? keccak256(encodePacked(["bytes32", "bytes32"], [a, b]))
    : keccak256(encodePacked(["bytes32", "bytes32"], [b, a]));
}

/** Build a 2-leaf tree. Returns root and proof for each leaf. */
function twoLeafTree(leaf1: Hex, leaf2: Hex): { root: Hex; proof1: Hex[]; proof2: Hex[] } {
  const root = sortedHash(leaf1, leaf2);
  return { root, proof1: [leaf2], proof2: [leaf1] };
}

/** Build a 1-leaf tree (root = leaf, empty proof). */
function oneLeafTree(leaf: Hex): { root: Hex; proof: Hex[] } {
  return { root: leaf, proof: [] };
}

// ─── Time helpers ────────────────────────────────────────────────────────────

async function advancePast(timestamp: bigint) {
  const connection = await hre.network.getOrCreate();
  const target = Number(timestamp) + 1;
  await connection.provider.send("evm_setNextBlockTimestamp", [target]);
  await connection.provider.send("evm_mine", []);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("League", () => {
  // ─── AC1: Entry happy path ──────────────────────────────────────────────────

  it("player can enter before lock time — EntrySubmitted emitted, fee held by contract", async () => {
    const { league, token, player1, entryFee, connection } = await deployLeague();
    const publicClient = await connection.viem.getPublicClient();

    await token.write.approve([league.address, entryFee], { account: player1.account });
    const hash = `0x${"ab".repeat(32)}` as Hex;
    const txHash = await league.write.enter([hash], { account: player1.account });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    const events = await league.getEvents.EntrySubmitted(
      {},
      { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }
    );
    assert.equal(events.length, 1);
    assert.equal(events[0].args.player?.toLowerCase(), player1.account.address.toLowerCase());
    assert.equal(events[0].args.commitmentHash, hash);

    // Contract holds the fee
    const balance = await token.read.balanceOf([league.address]);
    assert.equal(balance, entryFee);
  });

  it("second player can enter — totalEntries increments", async () => {
    const { league, token, player1, player2, entryFee } = await deployLeague();
    await token.write.approve([league.address, entryFee], { account: player1.account });
    await token.write.approve([league.address, entryFee], { account: player2.account });
    const hash = `0x${"ab".repeat(32)}` as Hex;
    await league.write.enter([hash], { account: player1.account });
    await league.write.enter([hash], { account: player2.account });
    assert.equal(await league.read.totalEntries(), 2n);
  });

  it("same wallet can enter multiple times up to maxEntriesPerWallet", async () => {
    const { league, token, player1, entryFee } = await deployLeague();
    const two = entryFee * 2n;
    await token.write.approve([league.address, two], { account: player1.account });
    const hash = `0x${"ab".repeat(32)}` as Hex;
    await league.write.enter([hash], { account: player1.account });
    await league.write.enter([hash], { account: player1.account });
    assert.equal(await league.read.totalEntries(), 2n);
  });

  // ─── AC2: Locked after lockTime ─────────────────────────────────────────────

  it("enter reverts LeagueLocked after lockTime passes", async () => {
    const { league, token, player1, entryFee, lockTime } = await deployLeague();
    await token.write.approve([league.address, entryFee], { account: player1.account });
    await advancePast(lockTime);
    const hash = `0x${"ab".repeat(32)}` as Hex;
    await assert.rejects(
      league.simulate.enter([hash], { account: player1.account }),
      (err: Error) => err.message.includes("LeagueLocked")
    );
  });

  // ─── AC2 edge: maxEntries cap ───────────────────────────────────────────────

  it("enter reverts MaxEntriesReached when cap is hit", async () => {
    const connection = await hre.network.getOrCreate();
    const [, devWalletClient, creator, oracle, player1, player2] =
      await connection.viem.getWalletClients();
    const token = await connection.viem.deployContract("MockERC20", ["T", "T"]);
    const entryFee = 1_000_000_000_000_000_000n;
    await token.write.mint([player1.account.address, entryFee * 5n]);
    await token.write.mint([player2.account.address, entryFee * 5n]);

    const publicClient = await connection.viem.getPublicClient();
    const latestBlock = await publicClient.getBlock({ blockTag: "latest" });
    const lockTime = latestBlock.timestamp + 7n * 24n * 60n * 60n;
    const league = await connection.viem.deployContract("League", [
      creator.account.address,
      oracle.account.address,
      devWalletClient.account.address,
      200n, 300n,
      { token: token.address, entryFee, maxEntries: 1n, maxEntriesPerWallet: 0n, minThreshold: 0n, revisionFee: 0n, revisionPolicy: 0, lockTime },
      ...LEAGUE_DISPUTE_DISABLED,
    ]);

    await token.write.approve([league.address, entryFee], { account: player1.account });
    await league.write.enter([`0x${"ab".repeat(32)}` as Hex], { account: player1.account });

    await token.write.approve([league.address, entryFee], { account: player2.account });
    await assert.rejects(
      league.simulate.enter([`0x${"cd".repeat(32)}` as Hex], { account: player2.account }),
      (err: Error) => err.message.includes("MaxEntriesReached")
    );
  });

  it("enter reverts MaxEntriesPerWalletReached when per-wallet cap is hit", async () => {
    const connection = await hre.network.getOrCreate();
    const [, devWalletClient, creator, oracle, player1] =
      await connection.viem.getWalletClients();
    const token = await connection.viem.deployContract("MockERC20", ["T", "T"]);
    const entryFee = 1_000_000_000_000_000_000n;
    await token.write.mint([player1.account.address, entryFee * 5n]);

    const publicClient = await connection.viem.getPublicClient();
    const latestBlock = await publicClient.getBlock({ blockTag: "latest" });
    const lockTime = latestBlock.timestamp + 7n * 24n * 60n * 60n;
    const league = await connection.viem.deployContract("League", [
      creator.account.address,
      oracle.account.address,
      devWalletClient.account.address,
      200n, 300n,
      { token: token.address, entryFee, maxEntries: 0n, maxEntriesPerWallet: 1n, minThreshold: 0n, revisionFee: 0n, revisionPolicy: 0, lockTime },
      ...LEAGUE_DISPUTE_DISABLED,
    ]);

    await token.write.approve([league.address, entryFee * 2n], { account: player1.account });
    await league.write.enter([`0x${"ab".repeat(32)}` as Hex], { account: player1.account });
    await assert.rejects(
      league.simulate.enter([`0x${"ab".repeat(32)}` as Hex], { account: player1.account }),
      (err: Error) => err.message.includes("MaxEntriesPerWalletReached")
    );
  });

  // ─── AC3: checkThreshold + claimRefund ─────────────────────────────────────

  it("checkThreshold transitions to Refunding when entries < minThreshold", async () => {
    // Deploy league inline with explicit minThreshold=2n to rule out fixture encoding issues
    const connection = await hre.network.getOrCreate();
    const [, devWalletClient, creator, oracle, player1] = await connection.viem.getWalletClients();
    const token = await connection.viem.deployContract("MockERC20", ["T", "T"]);
    const entryFee = 5_000_000_000_000_000_000n;
    await token.write.mint([player1.account.address, entryFee * 5n]);
    const publicClient = await connection.viem.getPublicClient();
    const { timestamp: evmNow } = await publicClient.getBlock({ blockTag: "latest" });
    const lockTime = evmNow + 7n * 24n * 60n * 60n;
    const league = await connection.viem.deployContract("League", [
      creator.account.address, oracle.account.address, devWalletClient.account.address,
      200n, 300n,
      { token: token.address, entryFee, maxEntries: 0n, maxEntriesPerWallet: 5n, minThreshold: 2n, revisionFee: 0n, revisionPolicy: 0, lockTime },
      ...LEAGUE_DISPUTE_DISABLED,
    ]);

    await token.write.approve([league.address, entryFee], { account: player1.account });
    await league.write.enter([`0x${"ab".repeat(32)}` as Hex], { account: player1.account });
    // minThreshold=2, but only 1 entry

    // Verify contract state matches deployment params
    assert.equal(await league.read.minThreshold(), 2n, "minThreshold must be 2 in contract");
    assert.equal(await league.read.totalEntries(), 1n, "totalEntries must be 1");

    await advancePast(lockTime);

    const txHashRaw = await league.write.checkThreshold({ account: player1.account });
    assert.ok(typeof txHashRaw === "string", `txHash must be string, got: ${typeof txHashRaw} = ${String(txHashRaw)}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHashRaw as `0x${string}` });
    assert.equal(receipt.status, "success", "checkThreshold tx must succeed (not revert)");
    assert.equal(await league.read.state(), 1, "state must be Refunding");

    const leagueRefundingTopic = getEventSelector("LeagueRefunding()");
    const refundLog = receipt.logs.find(
      (log) =>
        log.address.toLowerCase() === league.address.toLowerCase() &&
        log.topics[0] === leagueRefundingTopic
    );
    assert.ok(refundLog, "LeagueRefunding must appear in receipt logs");
  });

  it("claimRefund returns entryFee to player and emits RefundClaimed", async () => {
    const { league, token, player1, entryFee, lockTime, connection } = await deployLeague();
    const publicClient = await connection.viem.getPublicClient();

    await token.write.approve([league.address, entryFee], { account: player1.account });
    await league.write.enter([`0x${"ab".repeat(32)}` as Hex], { account: player1.account });

    await advancePast(lockTime);
    await league.write.checkThreshold();

    const balBefore = await token.read.balanceOf([player1.account.address]);
    const txHash = await league.write.claimRefund({ account: player1.account });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    const balAfter = await token.read.balanceOf([player1.account.address]);
    assert.equal(balAfter - balBefore, entryFee);

    const events = await league.getEvents.RefundClaimed(
      {},
      { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }
    );
    assert.equal(events.length, 1);
    assert.equal(events[0].args.amount, entryFee);
  });

  it("claimRefund for multi-entry wallet refunds all entryFees", async () => {
    // Deploy a custom league with minThreshold=3 and two entries for a single player
    const connection = await hre.network.getOrCreate();
    const publicClient = await connection.viem.getPublicClient();
    const latestBlock = await publicClient.getBlock({ blockTag: "latest" });
    const lt = latestBlock.timestamp + 7n * 24n * 60n * 60n;

    const [, devWalletClient, creator, oracle, player] = await connection.viem.getWalletClients();
    const tok = await connection.viem.deployContract("MockERC20", ["T", "T"]);
    const entryFee = 5_000_000_000_000_000_000n;
    await tok.write.mint([player.account.address, entryFee * 5n]);
    const lg = await connection.viem.deployContract("League", [
      creator.account.address, oracle.account.address, devWalletClient.account.address,
      200n, 300n,
      { token: tok.address, entryFee, maxEntries: 0n, maxEntriesPerWallet: 5n, minThreshold: 3n, revisionFee: 0n, revisionPolicy: 0, lockTime: lt },
      ...LEAGUE_DISPUTE_DISABLED,
    ]);
    await tok.write.approve([lg.address, entryFee * 2n], { account: player.account });
    await lg.write.enter([`0x${"ab".repeat(32)}` as Hex], { account: player.account });
    await lg.write.enter([`0x${"ab".repeat(32)}` as Hex], { account: player.account });
    // totalEntries=2, minThreshold=3 → threshold not met
    await advancePast(lt);
    await lg.write.checkThreshold();
    const balB = await tok.read.balanceOf([player.account.address]);
    await lg.write.claimRefund({ account: player.account });
    const balA = await tok.read.balanceOf([player.account.address]);
    assert.equal(balA - balB, entryFee * 2n);
  });

  it("double claimRefund reverts AlreadyClaimed", async () => {
    const { league, token, player1, entryFee, lockTime } = await deployLeague();
    await token.write.approve([league.address, entryFee], { account: player1.account });
    await league.write.enter([`0x${"ab".repeat(32)}` as Hex], { account: player1.account });
    await advancePast(lockTime);
    await league.write.checkThreshold();
    await league.write.claimRefund({ account: player1.account });
    await assert.rejects(
      league.simulate.claimRefund({ account: player1.account }),
      (err: Error) => err.message.includes("AlreadyClaimed")
    );
  });

  it("claimRefund before checkThreshold reverts LeagueNotRefunding", async () => {
    const { league, token, player1, entryFee } = await deployLeague();
    await token.write.approve([league.address, entryFee], { account: player1.account });
    await league.write.enter([`0x${"ab".repeat(32)}` as Hex], { account: player1.account });
    await assert.rejects(
      league.simulate.claimRefund({ account: player1.account }),
      (err: Error) => err.message.includes("LeagueNotRefunding")
    );
  });

  it("checkThreshold with minThreshold=0 does nothing and state stays Active", async () => {
    const connection = await hre.network.getOrCreate();
    const [, devWalletClient, creator, oracle] = await connection.viem.getWalletClients();
    const token = await connection.viem.deployContract("MockERC20", ["T", "T"]);
    const publicClient = await connection.viem.getPublicClient();
    const latestBlock = await publicClient.getBlock({ blockTag: "latest" });
    const lt = latestBlock.timestamp + 7n * 24n * 60n * 60n;
    const lg = await connection.viem.deployContract("League", [
      creator.account.address, oracle.account.address, devWalletClient.account.address,
      200n, 300n,
      { token: token.address, entryFee: 1_000_000_000_000_000_000n, maxEntries: 0n, maxEntriesPerWallet: 0n, minThreshold: 0n, revisionFee: 0n, revisionPolicy: 0, lockTime: lt },
      ...LEAGUE_DISPUTE_DISABLED,
    ]);
    await advancePast(lt);
    // Should not revert, state stays Active=0
    await lg.write.checkThreshold();
    assert.equal(await lg.read.state(), 0); // Active
  });

  it("checkThreshold reverts ThresholdMet when entries >= minThreshold", async () => {
    const { league, token, player1, player2, entryFee, lockTime } = await deployLeague();
    await token.write.approve([league.address, entryFee], { account: player1.account });
    await token.write.approve([league.address, entryFee], { account: player2.account });
    await league.write.enter([`0x${"ab".repeat(32)}` as Hex], { account: player1.account });
    await league.write.enter([`0x${"cd".repeat(32)}` as Hex], { account: player2.account });
    // totalEntries=2, minThreshold=2 → threshold is met
    await advancePast(lockTime);
    await assert.rejects(
      league.simulate.checkThreshold(),
      (err: Error) => err.message.includes("ThresholdMet")
    );
  });

  it("checkThreshold reverts LeagueNotActive if called before lockTime", async () => {
    const { league } = await deployLeague();
    await assert.rejects(
      league.simulate.checkThreshold(),
      (err: Error) => err.message.includes("LeagueNotActive")
    );
  });

  // ─── AC4: setMerkleRoot ─────────────────────────────────────────────────────

  it("devWallet can set Merkle root — state becomes Resolved, event emitted", async () => {
    const { league, devWallet, connection } = await deployLeague();
    const publicClient = await connection.viem.getPublicClient();
    const root = `0x${"de".repeat(32)}` as Hex;

    const txHash = await league.write.setMerkleRoot([root], { account: devWallet.account });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    const events = await league.getEvents.MerkleRootSet(
      {},
      { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }
    );
    assert.equal(events.length, 1);
    assert.equal(events[0].args.root, root);
    assert.equal(await league.read.state(), 2); // Resolved
    assert.equal(await league.read.merkleRoot(), root);
  });

  it("non-devWallet setMerkleRoot reverts NotAuthorized", async () => {
    const { league, player1 } = await deployLeague();
    const root = `0x${"de".repeat(32)}` as Hex;
    await assert.rejects(
      league.simulate.setMerkleRoot([root], { account: player1.account }),
      (err: Error) => err.message.includes("NotAuthorized")
    );
  });

  it("setMerkleRoot with zero bytes32 reverts InvalidParams", async () => {
    const { league, devWallet } = await deployLeague();
    const zeroRoot = `0x${"00".repeat(32)}` as Hex;
    await assert.rejects(
      league.simulate.setMerkleRoot([zeroRoot], { account: devWallet.account }),
      (err: Error) => err.message.includes("InvalidParams")
    );
  });

  it("second setMerkleRoot reverts MerkleRootAlreadySet", async () => {
    const { league, devWallet } = await deployLeague();
    const root = `0x${"de".repeat(32)}` as Hex;
    await league.write.setMerkleRoot([root], { account: devWallet.account });
    await assert.rejects(
      league.simulate.setMerkleRoot([root], { account: devWallet.account }),
      (err: Error) => err.message.includes("MerkleRootAlreadySet")
    );
  });

  it("setMerkleRoot succeeds from Refunding state (AC4 Active or Refunding)", async () => {
    const connection = await hre.network.getOrCreate();
    const [, devWalletClient, creator, oracle, player1] = await connection.viem.getWalletClients();
    const token = await connection.viem.deployContract("MockERC20", ["T", "T"]);
    const entryFee = 5_000_000_000_000_000_000n;
    await token.write.mint([player1.account.address, entryFee * 5n]);
    const publicClient = await connection.viem.getPublicClient();
    const { timestamp: evmNow } = await publicClient.getBlock({ blockTag: "latest" });
    const lockTime = evmNow + 7n * 24n * 60n * 60n;
    const league = await connection.viem.deployContract("League", [
      creator.account.address,
      oracle.account.address,
      devWalletClient.account.address,
      200n,
      300n,
      {
        token: token.address,
        entryFee,
        maxEntries: 0n,
        maxEntriesPerWallet: 5n,
        minThreshold: 2n,
        revisionFee: 0n,
        revisionPolicy: 0,
        lockTime,
      },
      ...LEAGUE_DISPUTE_DISABLED,
    ]);
    await token.write.approve([league.address, entryFee], { account: player1.account });
    await league.write.enter([`0x${"ab".repeat(32)}` as Hex], { account: player1.account });
    await advancePast(lockTime);
    await league.write.checkThreshold();
    assert.equal(await league.read.state(), 1); // Refunding

    const root = `0x${"de".repeat(32)}` as Hex;
    const txHash = await league.write.setMerkleRoot([root], { account: devWalletClient.account });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    const events = await league.getEvents.MerkleRootSet(
      {},
      { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }
    );
    assert.equal(events.length, 1);
    assert.equal(events[0].args.root, root);
    assert.equal(await league.read.state(), 2); // Resolved
    assert.equal(await league.read.merkleRoot(), root);
  });

  // ─── AC5/6: claimPrize ──────────────────────────────────────────────────────

  it("claimPrize transfers tokens to winner and emits PrizeClaimed", async () => {
    const { league, token, devWallet, player1, entryFee, connection } = await deployLeague();
    const publicClient = await connection.viem.getPublicClient();

    await token.write.approve([league.address, entryFee], { account: player1.account });
    await league.write.enter([`0x${"ab".repeat(32)}` as Hex], { account: player1.account });

    const prizeAmount = entryFee;
    const leaf = makeLeaf(player1.account.address, prizeAmount, 0);
    const { root, proof1 } = twoLeafTree(leaf, `0x${"ee".repeat(32)}` as Hex);

    await league.write.setMerkleRoot([root], { account: devWallet.account });

    const balB = await token.read.balanceOf([player1.account.address]);
    const txHash = await league.write.claimPrize([prizeAmount, proof1], { account: player1.account });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    const balA = await token.read.balanceOf([player1.account.address]);
    assert.equal(balA - balB, prizeAmount);

    const events = await league.getEvents.PrizeClaimed(
      {},
      { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }
    );
    assert.equal(events.length, 1);
    assert.equal(events[0].args.amount, prizeAmount);
  });

  it("claimPrize with 1-leaf tree (no proof) works", async () => {
    const { league, token, devWallet, player1, entryFee } = await deployLeague();
    await token.write.approve([league.address, entryFee], { account: player1.account });
    await league.write.enter([`0x${"ab".repeat(32)}` as Hex], { account: player1.account });

    const prizeAmount = entryFee;
    const leaf = makeLeaf(player1.account.address, prizeAmount, 0);
    const { root, proof } = oneLeafTree(leaf);

    await league.write.setMerkleRoot([root], { account: devWallet.account });
    const balB = await token.read.balanceOf([player1.account.address]);
    await league.write.claimPrize([prizeAmount, proof], { account: player1.account });
    const balA = await token.read.balanceOf([player1.account.address]);
    assert.equal(balA - balB, prizeAmount);
  });

  it("double claimPrize reverts AlreadyClaimed", async () => {
    const { league, token, devWallet, player1, entryFee } = await deployLeague();
    await token.write.approve([league.address, entryFee * 2n], { account: player1.account });
    await league.write.enter([`0x${"ab".repeat(32)}` as Hex], { account: player1.account });
    await league.write.enter([`0x${"ab".repeat(32)}` as Hex], { account: player1.account });

    const prizeAmount = entryFee;
    const leaf = makeLeaf(player1.account.address, prizeAmount, 0);
    const { root, proof } = oneLeafTree(leaf);
    await league.write.setMerkleRoot([root], { account: devWallet.account });
    await league.write.claimPrize([prizeAmount, proof], { account: player1.account });
    await assert.rejects(
      league.simulate.claimPrize([prizeAmount, proof], { account: player1.account }),
      (err: Error) => err.message.includes("AlreadyClaimed")
    );
  });

  it("claimPrize with invalid proof reverts InvalidProof", async () => {
    const { league, token, devWallet, player1, player2, entryFee } = await deployLeague();
    await token.write.approve([league.address, entryFee], { account: player1.account });
    await league.write.enter([`0x${"ab".repeat(32)}` as Hex], { account: player1.account });

    const prizeAmount = entryFee;
    const leaf = makeLeaf(player1.account.address, prizeAmount, 0);
    const { root } = oneLeafTree(leaf);
    await league.write.setMerkleRoot([root], { account: devWallet.account });

    // player2 tries to claim using player1's amount but wrong leaf
    await assert.rejects(
      league.simulate.claimPrize([prizeAmount, []], { account: player2.account }),
      (err: Error) => err.message.includes("InvalidProof")
    );
  });

  it("claimPrize before Resolved reverts LeagueNotResolved", async () => {
    const { league, player1 } = await deployLeague();
    await assert.rejects(
      league.simulate.claimPrize([1_000_000_000_000_000_000n, []], { account: player1.account }),
      (err: Error) => err.message.includes("LeagueNotResolved")
    );
  });

  // ─── AC8: claimFee ──────────────────────────────────────────────────────────

  it("claimFee transfers tokens and emits FeeClaimed (claimType=1)", async () => {
    const { league, token, devWallet, creator, entryFee, connection } = await deployLeague();
    const publicClient = await connection.viem.getPublicClient();

    // Mint some tokens so contract has a balance to transfer
    await token.write.mint([league.address, entryFee]);

    const feeAmount = entryFee / 10n;
    const leaf = makeLeaf(creator.account.address, feeAmount, 1);
    const { root, proof } = oneLeafTree(leaf);
    await league.write.setMerkleRoot([root], { account: devWallet.account });

    const balB = await token.read.balanceOf([creator.account.address]);
    const txHash = await league.write.claimFee([feeAmount, proof], { account: creator.account });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    const balA = await token.read.balanceOf([creator.account.address]);
    assert.equal(balA - balB, feeAmount);

    const events = await league.getEvents.FeeClaimed(
      {},
      { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }
    );
    assert.equal(events.length, 1);
    assert.equal(events[0].args.amount, feeAmount);
  });

  it("claimFee with prize-type leaf (claimType=0 in proof) reverts InvalidProof", async () => {
    const { league, token, devWallet, creator, entryFee } = await deployLeague();
    await token.write.mint([league.address, entryFee]);

    const feeAmount = entryFee / 10n;
    // Build a prize leaf (claimType=0) but try to use it for claimFee (expects claimType=1)
    const prizeleaf = makeLeaf(creator.account.address, feeAmount, 0);
    const { root, proof } = oneLeafTree(prizeleaf);
    await league.write.setMerkleRoot([root], { account: devWallet.account });

    await assert.rejects(
      league.simulate.claimFee([feeAmount, proof], { account: creator.account }),
      (err: Error) => err.message.includes("InvalidProof")
    );
  });

  it("double claimFee reverts AlreadyClaimed", async () => {
    const { league, token, devWallet, creator, entryFee } = await deployLeague();
    await token.write.mint([league.address, entryFee]);
    const feeAmount = entryFee / 10n;
    const leaf = makeLeaf(creator.account.address, feeAmount, 1);
    const { root, proof } = oneLeafTree(leaf);
    await league.write.setMerkleRoot([root], { account: devWallet.account });
    await league.write.claimFee([feeAmount, proof], { account: creator.account });
    await assert.rejects(
      league.simulate.claimFee([feeAmount, proof], { account: creator.account }),
      (err: Error) => err.message.includes("AlreadyClaimed")
    );
  });

  // ─── AC7: sweepUnclaimed ────────────────────────────────────────────────────

  it("sweepUnclaimed transfers remaining balance to devWallet after 90 days", async () => {
    const { league, token, devWallet, player1, entryFee, connection } = await deployLeague();
    const publicClient = await connection.viem.getPublicClient();

    await token.write.approve([league.address, entryFee], { account: player1.account });
    await league.write.enter([`0x${"ab".repeat(32)}` as Hex], { account: player1.account });

    const root = `0x${"de".repeat(32)}` as Hex;
    await league.write.setMerkleRoot([root], { account: devWallet.account });

    const merkleRootSetAt = await league.read.merkleRootSetAt();
    const ninetyDaysLater = merkleRootSetAt + 90n * 24n * 60n * 60n;
    await advancePast(ninetyDaysLater);

    const devBalB = await token.read.balanceOf([devWallet.account.address]);
    const txHash = await league.write.sweepUnclaimed({ account: devWallet.account });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    const devBalA = await token.read.balanceOf([devWallet.account.address]);
    assert.equal(devBalA - devBalB, entryFee);

    const events = await league.getEvents.UnclaimedSwept(
      {},
      { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }
    );
    assert.equal(events.length, 1);
    assert.equal(events[0].args.amount, entryFee);
  });

  it("sweepUnclaimed before 90 days reverts UnclaimedNotExpired", async () => {
    const { league, token, devWallet, player1, entryFee } = await deployLeague();
    await token.write.approve([league.address, entryFee], { account: player1.account });
    await league.write.enter([`0x${"ab".repeat(32)}` as Hex], { account: player1.account });
    const root = `0x${"de".repeat(32)}` as Hex;
    await league.write.setMerkleRoot([root], { account: devWallet.account });
    await assert.rejects(
      league.simulate.sweepUnclaimed({ account: devWallet.account }),
      (err: Error) => err.message.includes("UnclaimedNotExpired")
    );
  });

  it("sweepUnclaimed by non-devWallet reverts NotAuthorized", async () => {
    const { league, token, devWallet, player1, entryFee } = await deployLeague();
    await token.write.approve([league.address, entryFee], { account: player1.account });
    await league.write.enter([`0x${"ab".repeat(32)}` as Hex], { account: player1.account });
    const root = `0x${"de".repeat(32)}` as Hex;
    await league.write.setMerkleRoot([root], { account: devWallet.account });
    const merkleRootSetAt = await league.read.merkleRootSetAt();
    await advancePast(merkleRootSetAt + 90n * 24n * 60n * 60n);
    await assert.rejects(
      league.simulate.sweepUnclaimed({ account: player1.account }),
      (err: Error) => err.message.includes("NotAuthorized")
    );
  });

  it("sweepUnclaimed when state is not Resolved reverts LeagueNotResolved", async () => {
    const { league, devWallet } = await deployLeague();
    await assert.rejects(
      league.simulate.sweepUnclaimed({ account: devWallet.account }),
      (err: Error) => err.message.includes("LeagueNotResolved")
    );
  });

  // ─── Constructor guards ─────────────────────────────────────────────────────

  it("constructor reverts InvalidAddress for zero creator", async () => {
    const connection = await hre.network.getOrCreate();
    const [, devWalletClient, , oracle] = await connection.viem.getWalletClients();
    const token = await connection.viem.deployContract("MockERC20", ["T", "T"]);
    const zero = "0x0000000000000000000000000000000000000000" as const;
    const publicClient = await connection.viem.getPublicClient();
    const latestBlock = await publicClient.getBlock({ blockTag: "latest" });
    const lt = latestBlock.timestamp + 7n * 24n * 60n * 60n;
    await assert.rejects(
      connection.viem.deployContract("League", [
        zero, oracle.account.address, devWalletClient.account.address, 200n, 300n,
        { token: token.address, entryFee: 1n, maxEntries: 0n, maxEntriesPerWallet: 0n, minThreshold: 0n, revisionFee: 0n, revisionPolicy: 0, lockTime: lt },
        ...LEAGUE_DISPUTE_DISABLED,
      ]),
      (err: Error) => err.message.includes("InvalidAddress")
    );
  });

  it("constructor reverts InvalidParams when devFeeBps + creatorFeeCap > MAX_FEE_BPS", async () => {
    const connection = await hre.network.getOrCreate();
    const [, devWalletClient, creator, oracle] = await connection.viem.getWalletClients();
    const token = await connection.viem.deployContract("MockERC20", ["T", "T"]);
    const publicClient = await connection.viem.getPublicClient();
    const latestBlock = await publicClient.getBlock({ blockTag: "latest" });
    const lt = latestBlock.timestamp + 7n * 24n * 60n * 60n;
    await assert.rejects(
      connection.viem.deployContract("League", [
        creator.account.address, oracle.account.address, devWalletClient.account.address,
        600n, 500n, // 6% + 5% = 11% > 10%
        { token: token.address, entryFee: 1n, maxEntries: 0n, maxEntriesPerWallet: 0n, minThreshold: 0n, revisionFee: 0n, revisionPolicy: 0, lockTime: lt },
        ...LEAGUE_DISPUTE_DISABLED,
      ]),
      (err: Error) => err.message.includes("InvalidParams")
    );
  });
});
