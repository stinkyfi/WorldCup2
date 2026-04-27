import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { keccak256, encodePacked } from "viem";
import hre from "hardhat";
import { deployLeagueFactory } from "./fixtures/index.js";

type Hex = `0x${string}`;

function makeLeaf(address: Hex, amount: bigint, claimType: 0 | 1): Hex {
  return keccak256(encodePacked(["address", "uint256", "uint8"], [address, amount, claimType]));
}

function oneLeafTree(leaf: Hex): { root: Hex; proof: Hex[] } {
  return { root: leaf, proof: [] };
}

async function advanceToTimestamp(ts: bigint) {
  const connection = await hre.network.getOrCreate();
  await connection.provider.send("evm_setNextBlockTimestamp", [Number(ts)]);
  await connection.provider.send("evm_mine", []);
}

describe("Story 1.6 — security & edge cases", () => {
  it("claimPrize reentrancy via malicious ERC-20 reverts (ReentrancyGuard)", async () => {
    const connection = await hre.network.getOrCreate();
    const [, devWalletClient, creator, oracle, player1] = await connection.viem.getWalletClients();
    const token = await connection.viem.deployContract("MaliciousReentrantERC20", ["Bad", "BAD"]);
    const entryFee = 5_000_000_000_000_000_000n;
    await token.write.mint([player1.account.address, entryFee * 2n]);

    const publicClient = await connection.viem.getPublicClient();
    const { timestamp: now } = await publicClient.getBlock({ blockTag: "latest" });
    const lockTime = now + 86400n * 7n;
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
        maxEntriesPerWallet: 0n,
        minThreshold: 0n,
        revisionPolicy: 0,
        lockTime,
      },
    ]);

    await token.write.approve([league.address, entryFee], { account: player1.account });
    await league.write.enter([`0x${"ab".repeat(32)}` as Hex], { account: player1.account });

    const prizeAmount = entryFee;
    const leaf = makeLeaf(player1.account.address, prizeAmount, 0);
    const { root, proof } = oneLeafTree(leaf);
    await league.write.setMerkleRoot([root], { account: devWalletClient.account });

    await token.write.configureAttack([
      league.address,
      player1.account.address,
      1, // AttackKind.ClaimPrize
      prizeAmount,
      proof,
    ]);

    await assert.rejects(
      league.write.claimPrize([prizeAmount, proof], { account: player1.account }),
      (err: Error) =>
        err.message.includes("ReentrancyGuardReentrantCall") ||
        err.message.includes("reentrancy") ||
        err.message.includes("Reentrancy")
    );
  });

  it("claimRefund reentrancy via malicious ERC-20 reverts (ReentrancyGuard)", async () => {
    const connection = await hre.network.getOrCreate();
    const [, devWalletClient, creator, oracle, player1] = await connection.viem.getWalletClients();
    const token = await connection.viem.deployContract("MaliciousReentrantERC20", ["Bad2", "BD2"]);
    const entryFee = 3_000_000_000_000_000_000n;
    await token.write.mint([player1.account.address, entryFee * 3n]);

    const publicClient = await connection.viem.getPublicClient();
    const { timestamp: now } = await publicClient.getBlock({ blockTag: "latest" });
    const lockTime = now + 86400n * 7n;
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
        maxEntriesPerWallet: 0n,
        minThreshold: 2n,
        revisionPolicy: 0,
        lockTime,
      },
    ]);

    await token.write.approve([league.address, entryFee], { account: player1.account });
    await league.write.enter([`0x${"ab".repeat(32)}` as Hex], { account: player1.account });
    await advanceToTimestamp(lockTime + 1n);
    await league.write.checkThreshold();

    await token.write.configureAttack([
      league.address,
      player1.account.address,
      2, // AttackKind.ClaimRefund
      0n,
      [],
    ]);

    await assert.rejects(
      league.write.claimRefund({ account: player1.account }),
      (err: Error) =>
        err.message.includes("ReentrancyGuardReentrantCall") ||
        err.message.includes("reentrancy") ||
        err.message.includes("Reentrancy")
    );
  });

  it("createLeague reverts DevWalletTransferFailed when devWallet rejects ETH", async () => {
    const connection = await hre.network.getOrCreate();
    const [owner, , creator, oracle] = await connection.viem.getWalletClients();
    const rejector = await connection.viem.deployContract("RejectingEthReceiver", []);
    const whitelistRegistry = await connection.viem.deployContract("WhitelistRegistry", [
      owner.account.address,
    ]);
    const token = await connection.viem.deployContract("MockERC20", ["T", "T"]);
    await whitelistRegistry.write.approveToken([token.address]);
    const oracleController = await connection.viem.deployContract("OracleController", [
      owner.account.address,
      oracle.account.address,
      false,
    ]);
    const creationFee = 10_000_000_000_000_000n;
    const leagueFactory = await connection.viem.deployContract("LeagueFactory", [
      owner.account.address,
      whitelistRegistry.address,
      oracleController.address,
      rejector.address,
      creationFee,
      200n,
      300n,
      1_000_000_000_000_000_000n,
    ]);

    const publicClient = await connection.viem.getPublicClient();
    const { timestamp: latestTimestamp } = await publicClient.getBlock({ blockTag: "latest" });
    const params = {
      token: token.address,
      entryFee: 5_000_000_000_000_000_000n,
      maxEntries: 10n,
      maxEntriesPerWallet: 5n,
      minThreshold: 1n,
      revisionPolicy: 0,
      lockTime: latestTimestamp + 7n * 24n * 60n * 60n,
    } as const;

    await assert.rejects(
      leagueFactory.write.createLeague([params], {
        account: creator.account,
        value: creationFee,
      }),
      (err: Error) => err.message.includes("DevWalletTransferFailed")
    );
  });

  it("LeagueFactory constructor reverts InvalidAddress for zero whitelistRegistry", async () => {
    const connection = await hre.network.getOrCreate();
    const [owner, , , oracle] = await connection.viem.getWalletClients();
    const zero = "0x0000000000000000000000000000000000000000" as const;
    const wr = await connection.viem.deployContract("WhitelistRegistry", [owner.account.address]);
    const token = await connection.viem.deployContract("MockERC20", ["T", "T"]);
    await wr.write.approveToken([token.address]);
    const oc = await connection.viem.deployContract("OracleController", [
      owner.account.address,
      oracle.account.address,
      false,
    ]);
    await assert.rejects(
      connection.viem.deployContract("LeagueFactory", [
        owner.account.address,
        zero,
        oc.address,
        owner.account.address,
        1n,
        200n,
        300n,
        1n,
      ]),
      (err: Error) => err.message.includes("InvalidAddress")
    );
  });

  it("LeagueFactory constructor reverts InvalidAddress for zero oracleController", async () => {
    const connection = await hre.network.getOrCreate();
    const [owner] = await connection.viem.getWalletClients();
    const zero = "0x0000000000000000000000000000000000000000" as const;
    const wr = await connection.viem.deployContract("WhitelistRegistry", [owner.account.address]);
    const token = await connection.viem.deployContract("MockERC20", ["T", "T"]);
    await wr.write.approveToken([token.address]);
    await assert.rejects(
      connection.viem.deployContract("LeagueFactory", [
        owner.account.address,
        wr.address,
        zero,
        owner.account.address,
        1n,
        200n,
        300n,
        1n,
      ]),
      (err: Error) => err.message.includes("InvalidAddress")
    );
  });

  it("League constructor reverts InvalidAddress for zero oracleController", async () => {
    const connection = await hre.network.getOrCreate();
    const [, devWalletClient, creator] = await connection.viem.getWalletClients();
    const zero = "0x0000000000000000000000000000000000000000" as const;
    const token = await connection.viem.deployContract("MockERC20", ["T", "T"]);
    const publicClient = await connection.viem.getPublicClient();
    const { timestamp: lt } = await publicClient.getBlock({ blockTag: "latest" });
    await assert.rejects(
      connection.viem.deployContract("League", [
        creator.account.address,
        zero,
        devWalletClient.account.address,
        200n,
        300n,
        {
          token: token.address,
          entryFee: 1n,
          maxEntries: 0n,
          maxEntriesPerWallet: 0n,
          minThreshold: 0n,
          revisionPolicy: 0,
          lockTime: lt + 86400n,
        },
      ]),
      (err: Error) => err.message.includes("InvalidAddress")
    );
  });

  it("League constructor reverts InvalidAddress for zero devWallet", async () => {
    const connection = await hre.network.getOrCreate();
    const [, , creator, oracle] = await connection.viem.getWalletClients();
    const zero = "0x0000000000000000000000000000000000000000" as const;
    const token = await connection.viem.deployContract("MockERC20", ["T", "T"]);
    const publicClient = await connection.viem.getPublicClient();
    const { timestamp: lt } = await publicClient.getBlock({ blockTag: "latest" });
    await assert.rejects(
      connection.viem.deployContract("League", [
        creator.account.address,
        oracle.account.address,
        zero,
        200n,
        300n,
        {
          token: token.address,
          entryFee: 1n,
          maxEntries: 0n,
          maxEntriesPerWallet: 0n,
          minThreshold: 0n,
          revisionPolicy: 0,
          lockTime: lt + 86400n,
        },
      ]),
      (err: Error) => err.message.includes("InvalidAddress")
    );
  });

  it("checkThreshold second call after Refunding reverts LeagueNotActive", async () => {
    const connection = await hre.network.getOrCreate();
    const [, devWalletClient, creator, oracle, player1] = await connection.viem.getWalletClients();
    const token = await connection.viem.deployContract("MockERC20", ["T", "T"]);
    const entryFee = 2_000_000_000_000_000_000n;
    await token.write.mint([player1.account.address, entryFee * 3n]);
    const publicClient = await connection.viem.getPublicClient();
    const { timestamp: now } = await publicClient.getBlock({ blockTag: "latest" });
    const lockTime = now + 86400n * 7n;
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
        maxEntriesPerWallet: 0n,
        minThreshold: 2n,
        revisionPolicy: 0,
        lockTime,
      },
    ]);
    await token.write.approve([league.address, entryFee], { account: player1.account });
    await league.write.enter([`0x${"ab".repeat(32)}` as Hex], { account: player1.account });
    await advanceToTimestamp(lockTime + 1n);
    await league.write.checkThreshold();
    await assert.rejects(
      league.simulate.checkThreshold(),
      (err: Error) => err.message.includes("LeagueNotActive")
    );
  });

  it("enter succeeds well before lockTime; after lockTime simulate enter reverts LeagueLocked", async () => {
    const connection = await hre.network.getOrCreate();
    const [, devWalletClient, creator, oracle, player1] = await connection.viem.getWalletClients();
    const token = await connection.viem.deployContract("MockERC20", ["T", "T"]);
    const entryFee = 1_000_000_000_000_000_000n;
    await token.write.mint([player1.account.address, entryFee * 3n]);
    const publicClient = await connection.viem.getPublicClient();
    const { timestamp: now } = await publicClient.getBlock({ blockTag: "latest" });
    const lockTime = now + 500_000n;
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
        maxEntriesPerWallet: 0n,
        minThreshold: 0n,
        revisionPolicy: 0,
        lockTime,
      },
    ]);
    await token.write.approve([league.address, entryFee * 2n], { account: player1.account });
    await advanceToTimestamp(lockTime - 400_000n);
    await league.write.enter([`0x${"ab".repeat(32)}` as Hex], { account: player1.account });
    await advanceToTimestamp(lockTime);
    await assert.rejects(
      league.simulate.enter([`0x${"cd".repeat(32)}` as Hex], { account: player1.account }),
      (err: Error) => err.message.includes("LeagueLocked")
    );
  });

  it("fee-on-transfer token: league balance is below nominal entryFee after enter", async () => {
    const connection = await hre.network.getOrCreate();
    const [, devWalletClient, creator, oracle, player1] = await connection.viem.getWalletClients();
    const fee = 100_000_000_000_000_000n; // 0.1 token
    const token = await connection.viem.deployContract("FeeOnTransferERC20", ["F", "F", fee]);
    const entryFee = 5_000_000_000_000_000_000n;
    await token.write.mint([player1.account.address, entryFee * 2n]);
    const publicClient = await connection.viem.getPublicClient();
    const { timestamp: now } = await publicClient.getBlock({ blockTag: "latest" });
    const lockTime = now + 86400n * 7n;
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
        maxEntriesPerWallet: 0n,
        minThreshold: 0n,
        revisionPolicy: 0,
        lockTime,
      },
    ]);
    await token.write.approve([league.address, entryFee], { account: player1.account });
    await league.write.enter([`0x${"ab".repeat(32)}` as Hex], { account: player1.account });
    const bal = await token.read.balanceOf([league.address]);
    assert.equal(bal, entryFee - fee);
  });

  it("claimPrize with 1 wei dust amount succeeds", async () => {
    const connection = await hre.network.getOrCreate();
    const [, devWalletClient, creator, oracle, player1] = await connection.viem.getWalletClients();
    const token = await connection.viem.deployContract("MockERC20", ["T", "T"]);
    const entryFee = 5_000_000_000_000_000_000n;
    await token.write.mint([player1.account.address, entryFee * 2n]);
    const publicClient = await connection.viem.getPublicClient();
    const { timestamp: now } = await publicClient.getBlock({ blockTag: "latest" });
    const lockTime = now + 86400n * 7n;
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
        maxEntriesPerWallet: 0n,
        minThreshold: 0n,
        revisionPolicy: 0,
        lockTime,
      },
    ]);
    await token.write.approve([league.address, entryFee], { account: player1.account });
    await league.write.enter([`0x${"ab".repeat(32)}` as Hex], { account: player1.account });
    await token.write.mint([league.address, 1n]);
    const dust = 1n;
    const leaf = makeLeaf(player1.account.address, dust, 0);
    const { root, proof } = oneLeafTree(leaf);
    await league.write.setMerkleRoot([root], { account: devWalletClient.account });
    await league.write.claimPrize([dust, proof], { account: player1.account });
  });

  it("sweepUnclaimed succeeds with zero balance (early return, no event)", async () => {
    const connection = await hre.network.getOrCreate();
    const [, devWalletClient, creator, oracle, player1] = await connection.viem.getWalletClients();
    const token = await connection.viem.deployContract("MockERC20", ["T", "T"]);
    const entryFee = 2_000_000_000_000_000_000n;
    await token.write.mint([player1.account.address, entryFee * 2n]);
    const publicClient = await connection.viem.getPublicClient();
    const { timestamp: now } = await publicClient.getBlock({ blockTag: "latest" });
    const lockTime = now + 86400n * 7n;
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
        maxEntriesPerWallet: 0n,
        minThreshold: 0n,
        revisionPolicy: 0,
        lockTime,
      },
    ]);
    const root = `0x${"ee".repeat(32)}` as Hex;
    await league.write.setMerkleRoot([root], { account: devWalletClient.account });
    const merkleRootSetAt = await league.read.merkleRootSetAt();
    await advanceToTimestamp(merkleRootSetAt + 90n * 24n * 60n * 60n + 1n);
    await league.write.sweepUnclaimed({ account: devWalletClient.account });
  });

  it("claimFee before Resolved reverts LeagueNotResolved", async () => {
    const connection = await hre.network.getOrCreate();
    const [, devWalletClient, creator, oracle, player1] = await connection.viem.getWalletClients();
    const token = await connection.viem.deployContract("MockERC20", ["T", "T"]);
    const entryFee = 1_000_000_000_000_000_000n;
    await token.write.mint([player1.account.address, entryFee * 2n]);
    const publicClient = await connection.viem.getPublicClient();
    const { timestamp: now } = await publicClient.getBlock({ blockTag: "latest" });
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
        maxEntriesPerWallet: 0n,
        minThreshold: 0n,
        revisionPolicy: 0,
        lockTime: now + 86400n * 7n,
      },
    ]);
    await assert.rejects(
      league.simulate.claimFee([1n, []], { account: creator.account }),
      (err: Error) => err.message.includes("LeagueNotResolved")
    );
  });

  it("setGlobalParams allows zero devFeeBps and zero creatorFeeCap", async () => {
    const { leagueFactory, owner, latestTimestamp } = await deployLeagueFactory();
    const txHash = await leagueFactory.write.setGlobalParams([0n, 0n, 1n], { account: owner.account });
    const connection = await hre.network.getOrCreate();
    const publicClient = await connection.viem.getPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    assert.equal(receipt.status, "success");
    assert.equal(await leagueFactory.read.devFeeBps(), 0n);
    assert.equal(await leagueFactory.read.creatorFeeCap(), 0n);
    assert.ok(latestTimestamp > 0n);
  });
});
