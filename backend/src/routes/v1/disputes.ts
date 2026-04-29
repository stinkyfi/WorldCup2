import type { FastifyPluginAsync } from "fastify";
import {
  createPublicClient,
  decodeEventLog,
  decodeFunctionData,
  getAddress,
  http,
  type Address,
  type Hex,
  type PublicClient,
  zeroHash,
} from "viem";
import { z } from "zod";
import { prisma } from "../../db.js";
import { addressToTeamKey } from "../../indexer/scoring.js";
import { sendError, sendSuccess } from "../../lib/envelope.js";
import { leagueAbi } from "../../lib/leagueAbi.js";
import { oracleControllerAbi } from "../../lib/oracleControllerAbi.js";
import { loadStagingTeamKeysForGroup } from "../../lib/oracleStagingReference.js";
import { groupLetterFromId } from "../../lib/worldCupGroups.js";
import { SESSION_COOKIE_NAME } from "./auth.js";

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address");

async function sessionFromRequest(request: { cookies: Record<string, string | undefined> }) {
  const sid = request.cookies[SESSION_COOKIE_NAME];
  if (!sid) return null;
  const session = await prisma.authSession.findUnique({ where: { id: sid } });
  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.authSession.delete({ where: { id: sid } }).catch(() => undefined);
    }
    return null;
  }
  return session;
}

function rpcUrlForChain(chainId: number): string | null {
  const v = process.env[`RPC_URL_${chainId}`];
  if (!v || !v.trim()) return null;
  return v.trim();
}

function disputeWindowMs(): number {
  const raw = process.env.DISPUTE_WINDOW_MS;
  if (raw && /^\d+$/.test(raw.trim())) return Math.max(60_000, Number(raw.trim()));
  return 86_400_000;
}

const recordBodySchema = z.object({
  chainId: z.number().int().positive(),
  leagueAddress: addressSchema,
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/i, "Invalid tx hash"),
  description: z.string().min(1).max(8000),
});

function sanitizeDescription(s: string): string {
  return s.trim().replace(/\u0000/g, "").slice(0, 8000);
}

const disputeIdParamSchema = z.string().min(10).max(40);

async function readOracleTeamKeysForGroup(params: {
  rpcUrl: string;
  leagueAddress: Address;
  groupId: number;
}): Promise<{ teamKeys: [string, string, string, string] | null; error: string | null }> {
  const { rpcUrl, leagueAddress, groupId } = params;
  try {
    const publicClient = createPublicClient({ transport: http(rpcUrl) });
    const controller = (await publicClient.readContract({
      address: leagueAddress,
      abi: leagueAbi,
      functionName: "oracleController",
    })) as Address;

    const posted = await publicClient.readContract({
      address: controller,
      abi: oracleControllerAbi,
      functionName: "hasResultsPosted",
      args: [groupId],
    });
    if (!posted) {
      return { teamKeys: null, error: "Oracle has not posted results for this group yet." };
    }

    const res = await publicClient.readContract({
      address: controller,
      abi: oracleControllerAbi,
      functionName: "getResults",
      args: [groupId],
    });
    const a = res as unknown as [Address, Address, Address, Address];
    const keys: [string, string, string, string] = [
      addressToTeamKey({ groupId, address: a[0] }) ?? "?",
      addressToTeamKey({ groupId, address: a[1] }) ?? "?",
      addressToTeamKey({ groupId, address: a[2] }) ?? "?",
      addressToTeamKey({ groupId, address: a[3] }) ?? "?",
    ];
    return { teamKeys: keys, error: null };
  } catch (e) {
    const msg = (e as Error | null | undefined)?.message ?? "RPC read failed.";
    return { teamKeys: null, error: msg.slice(0, 500) };
  }
}

async function resolveOnChainDisputeIndex(params: {
  publicClient: PublicClient;
  leagueAddress: Address;
  disputantLc: string;
  groupId: number;
  isCreator: boolean;
  storedIndex: number | null;
}): Promise<{ index: number | null; hint: string | null }> {
  const { publicClient, leagueAddress, disputantLc, groupId, isCreator, storedIndex } = params;

  const matchesOpen = (slot: readonly [Address, number, boolean, boolean]) => {
    const [disp, gid, creator, settled] = slot;
    return (
      getAddress(disp).toLowerCase() === disputantLc &&
      Number(gid) === groupId &&
      Boolean(creator) === isCreator &&
      !settled
    );
  };

  if (storedIndex !== null && storedIndex >= 0) {
    try {
      const slot = (await publicClient.readContract({
        address: leagueAddress,
        abi: leagueAbi,
        functionName: "disputeAt",
        args: [BigInt(storedIndex)],
      })) as readonly [Address, number, boolean, boolean];
      if (matchesOpen(slot)) return { index: storedIndex, hint: null };
      const settled = Boolean(slot[3]);
      if (
        settled &&
        getAddress(slot[0]).toLowerCase() === disputantLc &&
        Number(slot[1]) === groupId &&
        Boolean(slot[2]) === isCreator
      ) {
        return { index: storedIndex, hint: "already_settled_on_chain" };
      }
    } catch {
      // scan below
    }
  }

  try {
    const cnt = await publicClient.readContract({
      address: leagueAddress,
      abi: leagueAbi,
      functionName: "disputeCount",
    });
    const n = Number(cnt);
    for (let i = 0; i < n; i++) {
      const slot = (await publicClient.readContract({
        address: leagueAddress,
        abi: leagueAbi,
        functionName: "disputeAt",
        args: [BigInt(i)],
      })) as readonly [Address, number, boolean, boolean];
      if (matchesOpen(slot)) return { index: i, hint: null };
    }
  } catch {
    return { index: null, hint: "rpc_slot_scan_failed" };
  }

  return {
    index: null,
    hint: "no_matching_open_slot",
  };
}

const settlementBodySchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/i, "Invalid tx hash"),
  kind: z.enum(["dismiss_refund", "dismiss_confiscate", "override_results", "trigger_refund"]),
});

/** Epic 7.1 — record dispute narrative after on-chain `fileDispute`; admin list for 7.2. */
export const disputeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/disputes/record", async (request, reply) => {
    const session = await sessionFromRequest(request);
    if (!session) {
      return sendError(reply, 401, "UNAUTHORIZED", "Sign in required.");
    }

    const parsed = recordBodySchema.safeParse(request.body);
    if (!parsed.success) throw parsed.error;
    const b = parsed.data;
    const leagueAddr = getAddress(b.leagueAddress);
    const viewer = getAddress(session.address as Hex);
    const desc = sanitizeDescription(parsed.data.description);
    if (!desc) {
      return sendError(reply, 422, "VALIDATION_ERROR", "Description is required.");
    }

    const existing = await prisma.dispute.findUnique({ where: { txHash: b.txHash.toLowerCase() } });
    if (existing) {
      return sendSuccess(reply, { id: existing.id, duplicate: true });
    }

    const rpcUrl = rpcUrlForChain(b.chainId);
    if (!rpcUrl) {
      return sendError(reply, 503, "CONFIG", `RPC_URL_${b.chainId} is not configured.`);
    }

    const row = await prisma.league.findFirst({
      where: {
        chainId: b.chainId,
        contractAddress: { equals: leagueAddr, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (!row) {
      return sendError(reply, 404, "NOT_FOUND", "League not found for this chain.");
    }

    const publicClient = createPublicClient({ transport: http(rpcUrl) });
    const receipt = await publicClient.getTransactionReceipt({ hash: b.txHash as Hex });
    if (!receipt || receipt.status !== "success") {
      return sendError(reply, 422, "TX_NOT_CONFIRMED", "Transaction not found or not successful.");
    }
    if (!receipt.to || getAddress(receipt.to) !== leagueAddr) {
      return sendError(reply, 422, "TX_MISMATCH", "Transaction was not sent to this league contract.");
    }

    let disputant: Hex | null = null;
    let groupId: number | null = null;
    let isCreator: boolean | null = null;

    for (const log of receipt.logs) {
      if (getAddress(log.address) !== leagueAddr) continue;
      try {
        const decoded = decodeEventLog({
          abi: leagueAbi,
          data: log.data,
          topics: log.topics,
          strict: false,
        });
        if (decoded.eventName === "DisputeFiled") {
          const args = decoded.args as {
            disputant?: Hex;
            groupId?: number | bigint;
            isCreator?: boolean;
          };
          if (args.disputant !== undefined && args.groupId !== undefined && args.isCreator !== undefined) {
            disputant = getAddress(args.disputant);
            groupId = Number(args.groupId);
            isCreator = Boolean(args.isCreator);
            break;
          }
        }
      } catch {
        // not this event
      }
    }

    if (!disputant || groupId === null || isCreator === null) {
      return sendError(reply, 422, "NO_DISPUTE_EVENT", "Receipt does not contain a DisputeFiled event for this league.");
    }
    if (disputant !== viewer) {
      return sendError(reply, 403, "FORBIDDEN", "Session wallet does not match the disputant on-chain.");
    }

    let onChainDisputeIndex: number | null = null;
    try {
      const bn = receipt.blockNumber;
      const cnt = await publicClient.readContract({
        address: leagueAddr,
        abi: leagueAbi,
        functionName: "disputeCount",
        blockNumber: bn,
      });
      const idx = Number(cnt) - 1;
      if (idx >= 0) {
        const slot = (await publicClient.readContract({
          address: leagueAddr,
          abi: leagueAbi,
          functionName: "disputeAt",
          args: [BigInt(idx)],
          blockNumber: bn,
        })) as readonly [Address, number, boolean, boolean];
        if (
          getAddress(slot[0]).toLowerCase() === disputant.toLowerCase() &&
          Number(slot[1]) === groupId &&
          Boolean(slot[2]) === isCreator &&
          !slot[3]
        ) {
          onChainDisputeIndex = idx;
        }
      }
    } catch {
      onChainDisputeIndex = null;
    }

    const created = await prisma.dispute.create({
      data: {
        chainId: b.chainId,
        leagueAddress: leagueAddr.toLowerCase(),
        txHash: b.txHash.toLowerCase(),
        disputant: disputant.toLowerCase(),
        groupId,
        isCreator,
        description: desc,
        onChainDisputeIndex,
      },
      select: { id: true },
    });

    return sendSuccess(reply, { id: created.id, duplicate: false });
  });

  fastify.get("/disputes/eligibility", async (request, reply) => {
    const q = z
      .object({
        chainId: z.string().regex(/^\d+$/),
        leagueAddress: addressSchema,
      })
      .safeParse(request.query);
    if (!q.success) throw q.error;

    const chainId = Number(q.data.chainId);
    const leagueAddress = getAddress(q.data.leagueAddress);
    const rpcUrl = rpcUrlForChain(chainId);
    if (!rpcUrl) {
      return sendSuccess(reply, {
        eligible: false,
        reason: "rpc_unconfigured",
        windowEndsAt: null,
        disputeDepositToken: null,
        disputeDepositAmount: null,
      });
    }

    const row = await prisma.league.findFirst({
      where: { chainId, contractAddress: { equals: leagueAddress, mode: "insensitive" } },
      select: { id: true },
    });
    if (!row) {
      return sendSuccess(reply, {
        eligible: false,
        reason: "league_not_indexed",
        windowEndsAt: null,
        disputeDepositToken: null,
        disputeDepositAmount: null,
      });
    }

    const publicClient = createPublicClient({ transport: http(rpcUrl) });
    const [state, merkleRoot, lockTime, depToken, depAmt] = await Promise.all([
      publicClient.readContract({ address: leagueAddress, abi: leagueAbi, functionName: "state" }),
      publicClient.readContract({ address: leagueAddress, abi: leagueAbi, functionName: "merkleRoot" }),
      publicClient.readContract({ address: leagueAddress, abi: leagueAbi, functionName: "lockTime" }),
      publicClient.readContract({ address: leagueAddress, abi: leagueAbi, functionName: "disputeDepositToken" }),
      publicClient.readContract({ address: leagueAddress, abi: leagueAbi, functionName: "disputeDepositAmount" }),
    ]);

    const nowSec = BigInt(Math.floor(Date.now() / 1000));
    if (nowSec < lockTime) {
      return sendSuccess(reply, {
        eligible: false,
        reason: "predictions_still_open",
        windowEndsAt: null,
        disputeDepositToken: depToken,
        disputeDepositAmount: depAmt.toString(),
      });
    }
    const st = typeof state === "bigint" ? state : BigInt(state as number);
    if (st !== 0n || merkleRoot !== zeroHash) {
      return sendSuccess(reply, {
        eligible: false,
        reason: "league_not_disputable",
        windowEndsAt: null,
        disputeDepositToken: depToken,
        disputeDepositAmount: depAmt.toString(),
      });
    }
    if (depToken === "0x0000000000000000000000000000000000000000") {
      return sendSuccess(reply, {
        eligible: false,
        reason: "disputes_disabled_on_contract",
        windowEndsAt: null,
        disputeDepositToken: depToken,
        disputeDepositAmount: depAmt.toString(),
      });
    }

    const latestPost = await prisma.oraclePost.findFirst({
      where: { chainId, success: true },
      orderBy: { postedAt: "desc" },
      select: { postedAt: true },
    });

    if (!latestPost) {
      return sendSuccess(reply, {
        eligible: false,
        reason: "no_oracle_posts",
        windowEndsAt: null,
        disputeDepositToken: depToken,
        disputeDepositAmount: depAmt.toString(),
      });
    }

    const windowEnd = latestPost.postedAt.getTime() + disputeWindowMs();
    if (Date.now() > windowEnd) {
      return sendSuccess(reply, {
        eligible: false,
        reason: "dispute_window_closed",
        windowEndsAt: new Date(windowEnd).toISOString(),
        disputeDepositToken: depToken,
        disputeDepositAmount: depAmt.toString(),
      });
    }

    return sendSuccess(reply, {
      eligible: true,
      reason: null,
      windowEndsAt: new Date(windowEnd).toISOString(),
      disputeDepositToken: depToken,
      disputeDepositAmount: depAmt.toString(),
    });
  });

  fastify.get("/admin/disputes", async (request, reply) => {
    const session = await sessionFromRequest(request);
    if (!session) {
      return sendError(reply, 401, "UNAUTHORIZED", "Sign in required.");
    }
    if (!session.isAdmin) {
      return sendError(reply, 403, "FORBIDDEN", "Admin access required.");
    }

    const rows = await prisma.dispute.findMany({
      where: { status: "open" },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const leagueTitles = new Map<string, string>();
    for (const r of rows) {
      const key = `${r.chainId}:${r.leagueAddress.toLowerCase()}`;
      if (leagueTitles.has(key)) continue;
      const league = await prisma.league.findFirst({
        where: {
          chainId: r.chainId,
          contractAddress: { equals: r.leagueAddress, mode: "insensitive" },
        },
        select: { title: true },
      });
      leagueTitles.set(key, league?.title ?? "Unknown league");
    }

    const data = rows.map((r) => ({
      id: r.id,
      chainId: r.chainId,
      leagueAddress: r.leagueAddress,
      leagueTitle: leagueTitles.get(`${r.chainId}:${r.leagueAddress.toLowerCase()}`) ?? "Unknown league",
      txHash: r.txHash,
      disputant: r.disputant,
      groupId: r.groupId,
      isCreator: r.isCreator,
      description: r.description,
      createdAt: r.createdAt.toISOString(),
    }));

    return sendSuccess(reply, { disputes: data });
  });

  /** Epic 7.2 — single dispute: on-chain oracle vs staging reference + related filings. */
  fastify.get("/admin/disputes/:disputeId", async (request, reply) => {
    const session = await sessionFromRequest(request);
    if (!session) {
      return sendError(reply, 401, "UNAUTHORIZED", "Sign in required.");
    }
    if (!session.isAdmin) {
      return sendError(reply, 403, "FORBIDDEN", "Admin access required.");
    }

    const parsedId = disputeIdParamSchema.safeParse((request.params as { disputeId: string }).disputeId);
    if (!parsedId.success) {
      return sendError(reply, 422, "VALIDATION_ERROR", "Invalid dispute id.");
    }

    const d = await prisma.dispute.findFirst({
      where: { id: parsedId.data, status: "open" },
    });
    if (!d) {
      return sendError(reply, 404, "NOT_FOUND", "Open dispute not found.");
    }

    const league = await prisma.league.findFirst({
      where: {
        chainId: d.chainId,
        contractAddress: { equals: d.leagueAddress, mode: "insensitive" },
      },
      select: { title: true },
    });
    const leagueTitle = league?.title ?? "Unknown league";
    const leagueAddr = getAddress(d.leagueAddress as Hex);
    const groupLetter = groupLetterFromId(d.groupId);

    const rpcUrl = rpcUrlForChain(d.chainId);
    let oracleTeamKeys: [string, string, string, string] | null = null;
    let oracleReadError: string | null = null;
    let depositToken: string | null = null;
    let depositAmountWei: string | null = null;
    let onChainDisputeIndex: number | null = null;
    let onChainDisputeIndexHint: string | null = null;
    let oracleController: string | null = null;

    if (rpcUrl) {
      const publicClient = createPublicClient({ transport: http(rpcUrl) });
      const oracle = await readOracleTeamKeysForGroup({
        rpcUrl,
        leagueAddress: leagueAddr,
        groupId: d.groupId,
      });
      oracleTeamKeys = oracle.teamKeys;
      oracleReadError = oracle.error;

      const idxRes = await resolveOnChainDisputeIndex({
        publicClient,
        leagueAddress: leagueAddr,
        disputantLc: d.disputant.toLowerCase(),
        groupId: d.groupId,
        isCreator: d.isCreator,
        storedIndex: d.onChainDisputeIndex,
      });
      onChainDisputeIndex = idxRes.index;
      onChainDisputeIndexHint = idxRes.hint;

      try {
        oracleController = getAddress(
          (await publicClient.readContract({
            address: leagueAddr,
            abi: leagueAbi,
            functionName: "oracleController",
          })) as Address,
        );
      } catch {
        oracleController = null;
      }

      if (!d.isCreator) {
        try {
          const [tok, amt] = await Promise.all([
            publicClient.readContract({
              address: leagueAddr,
              abi: leagueAbi,
              functionName: "disputeDepositToken",
            }),
            publicClient.readContract({
              address: leagueAddr,
              abi: leagueAbi,
              functionName: "disputeDepositAmount",
            }),
          ]);
          depositToken = getAddress(tok as Address);
          depositAmountWei = (amt as bigint).toString();
        } catch {
          depositToken = null;
          depositAmountWei = null;
        }
      }
    } else {
      oracleReadError = `RPC_URL_${d.chainId} is not configured.`;
    }

    const referenceTeamKeys = loadStagingTeamKeysForGroup(d.groupId);
    const referenceSource: "staging_json" | null = referenceTeamKeys ? "staging_json" : null;

    let oracleMatchesReference: boolean | null = null;
    if (oracleTeamKeys && referenceTeamKeys) {
      oracleMatchesReference = oracleTeamKeys.every((k, i) => k === referenceTeamKeys[i]);
    }

    const related = await prisma.dispute.findMany({
      where: {
        status: "open",
        chainId: d.chainId,
        leagueAddress: { equals: d.leagueAddress, mode: "insensitive" },
        groupId: d.groupId,
        NOT: { id: d.id },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        txHash: true,
        disputant: true,
        isCreator: true,
        description: true,
        createdAt: true,
      },
    });

    return sendSuccess(reply, {
      dispute: {
        id: d.id,
        chainId: d.chainId,
        leagueAddress: d.leagueAddress,
        leagueTitle,
        txHash: d.txHash,
        disputant: d.disputant,
        groupId: d.groupId,
        groupLabel: groupLetter ? `Group ${groupLetter}` : `Group ${d.groupId}`,
        isCreator: d.isCreator,
        description: d.description,
        createdAt: d.createdAt.toISOString(),
      },
      rankings: {
        oracleTeamKeys,
        oracleReadError,
        referenceTeamKeys: referenceTeamKeys ? [...referenceTeamKeys] : null,
        referenceSource,
        referenceNote:
          referenceSource === null
            ? "No staging row for this group in ORACLE_STAGING_GROUPS_JSON — add one to compare here, or verify against your canonical results source."
            : null,
        oracleMatchesReference,
      },
      deposit: d.isCreator
        ? { kind: "creator_waived" as const }
        : {
            kind: "erc20" as const,
            tokenAddress: depositToken,
            amountWei: depositAmountWei,
          },
      relatedOpenDisputes: related.map((r) => ({
        id: r.id,
        txHash: r.txHash,
        disputant: r.disputant,
        isCreator: r.isCreator,
        description: r.description,
        createdAt: r.createdAt.toISOString(),
      })),
      resolution: {
        onChainDisputeIndex,
        onChainDisputeIndexHint,
        oracleController,
      },
    });
  });

  /** Epic 7.3 — record successful on-chain settlement so open-disputes list stays accurate. */
  fastify.post("/admin/disputes/:disputeId/settle", async (request, reply) => {
    const session = await sessionFromRequest(request);
    if (!session) {
      return sendError(reply, 401, "UNAUTHORIZED", "Sign in required.");
    }
    if (!session.isAdmin) {
      return sendError(reply, 403, "FORBIDDEN", "Admin access required.");
    }

    const parsedId = disputeIdParamSchema.safeParse((request.params as { disputeId: string }).disputeId);
    if (!parsedId.success) {
      return sendError(reply, 422, "VALIDATION_ERROR", "Invalid dispute id.");
    }

    const parsedBody = settlementBodySchema.safeParse(request.body);
    if (!parsedBody.success) throw parsedBody.error;

    const d = await prisma.dispute.findFirst({
      where: { id: parsedId.data, status: "open" },
    });
    if (!d) {
      return sendError(reply, 404, "NOT_FOUND", "Open dispute not found.");
    }

    const txLower = parsedBody.data.txHash.toLowerCase();
    if (d.resolutionTxHash?.toLowerCase() === txLower) {
      return sendSuccess(reply, { id: d.id, duplicate: true });
    }

    const rpcUrl = rpcUrlForChain(d.chainId);
    if (!rpcUrl) {
      return sendError(reply, 503, "CONFIG", `RPC_URL_${d.chainId} is not configured.`);
    }

    const leagueAddr = getAddress(d.leagueAddress as Hex);
    const publicClient = createPublicClient({ transport: http(rpcUrl) });
    const receipt = await publicClient.getTransactionReceipt({ hash: parsedBody.data.txHash as Hex });
    if (!receipt || receipt.status !== "success") {
      return sendError(reply, 422, "TX_NOT_CONFIRMED", "Transaction not found or not successful.");
    }

    const tx = await publicClient.getTransaction({ hash: parsedBody.data.txHash as Hex });
    if (!tx || !tx.input || tx.input === "0x") {
      return sendError(reply, 422, "TX_INVALID", "Transaction has no calldata.");
    }

    const kind = parsedBody.data.kind;
    let newStatus: string;

    if (kind === "trigger_refund") {
      if (!receipt.to || getAddress(receipt.to) !== leagueAddr) {
        return sendError(reply, 422, "TX_MISMATCH", "Transaction target must be the league contract.");
      }
      const decoded = decodeFunctionData({ abi: leagueAbi, data: tx.input });
      if (decoded.functionName !== "triggerRefund") {
        return sendError(reply, 422, "TX_DECODE", "Expected League.triggerRefund() calldata.");
      }
      newStatus = "league_refund_triggered";
      const resUpdate = await prisma.dispute.updateMany({
        where: {
          status: "open",
          chainId: d.chainId,
          leagueAddress: { equals: d.leagueAddress, mode: "insensitive" },
        },
        data: { status: newStatus, resolutionTxHash: txLower },
      });
      return sendSuccess(reply, { id: d.id, duplicate: false, updatedCount: resUpdate.count });
    }

    if (kind === "override_results") {
      const controller = getAddress(
        (await publicClient.readContract({
          address: leagueAddr,
          abi: leagueAbi,
          functionName: "oracleController",
        })) as Address,
      );
      if (!receipt.to || getAddress(receipt.to) !== controller) {
        return sendError(reply, 422, "TX_MISMATCH", "Transaction target must be the league's OracleController.");
      }
      const decoded = decodeFunctionData({ abi: oracleControllerAbi, data: tx.input });
      if (decoded.functionName !== "overrideResults") {
        return sendError(reply, 422, "TX_DECODE", "Expected OracleController.overrideResults calldata.");
      }
      const args = decoded.args as unknown as readonly [number | bigint, readonly Address[]];
      const gid = Number(args[0]);
      if (gid !== d.groupId) {
        return sendError(reply, 422, "GROUP_MISMATCH", "Override groupId does not match this dispute.");
      }
      newStatus = "settled_override";
      const resUpdate = await prisma.dispute.updateMany({
        where: {
          status: "open",
          chainId: d.chainId,
          leagueAddress: { equals: d.leagueAddress, mode: "insensitive" },
          groupId: d.groupId,
        },
        data: { status: newStatus, resolutionTxHash: txLower },
      });
      return sendSuccess(reply, { id: d.id, duplicate: false, updatedCount: resUpdate.count });
    }

    if (!receipt.to || getAddress(receipt.to) !== leagueAddr) {
      return sendError(reply, 422, "TX_MISMATCH", "Transaction target must be the league contract.");
    }

    const decoded = decodeFunctionData({ abi: leagueAbi, data: tx.input });
    const disputeIdxArg = (decoded.args as unknown as readonly [bigint])[0];
    const disputeIdx = Number(disputeIdxArg);

    if (kind === "dismiss_refund") {
      if (decoded.functionName !== "dismissDisputeRefundDeposit") {
        return sendError(reply, 422, "TX_DECODE", "Expected League.dismissDisputeRefundDeposit(uint256).");
      }
      newStatus = "settled_dismiss_refund";
    } else {
      if (decoded.functionName !== "dismissDisputeConfiscate") {
        return sendError(reply, 422, "TX_DECODE", "Expected League.dismissDisputeConfiscate(uint256).");
      }
      if (d.isCreator) {
        return sendError(reply, 422, "INVALID", "Creator disputes cannot be confiscated on-chain.");
      }
      newStatus = "settled_dismiss_confiscate";
    }

    const slot = (await publicClient.readContract({
      address: leagueAddr,
      abi: leagueAbi,
      functionName: "disputeAt",
      args: [BigInt(disputeIdx)],
    })) as readonly [Address, number, boolean, boolean];
    const settled = Boolean(slot[3]);
    if (!settled) {
      return sendError(reply, 422, "ONCHAIN_STATE", "On-chain dispute slot is not marked settled after this tx.");
    }
    if (getAddress(slot[0]).toLowerCase() !== d.disputant.toLowerCase() || Number(slot[1]) !== d.groupId || Boolean(slot[2]) !== d.isCreator) {
      return sendError(reply, 422, "DISPUTE_MISMATCH", "Calldata dispute index does not match this Postgres dispute row.");
    }

    await prisma.dispute.update({
      where: { id: d.id },
      data: { status: newStatus, resolutionTxHash: txLower },
    });

    return sendSuccess(reply, { id: d.id, duplicate: false, updatedCount: 1 });
  });
};
