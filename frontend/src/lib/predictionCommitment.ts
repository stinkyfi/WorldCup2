import { keccak256, toBytes } from "viem";
import type { WorldCupGroupId } from "@/lib/worldCupGroups";

export type PredictionPayloadV2 = {
  version: 2;
  leagueAddress: `0x${string}`;
  entryId: string;
  walletAddress: `0x${string}`;
  // Rankings are team ids in position order [1,2,3,4]
  groups: Record<WorldCupGroupId, [string, string, string, string]>;
  tiebreakerTotalGoals: number; // 1..1000
};

type LegacyPredictionPayloadV1 = {
  version: 1;
  leagueAddress: `0x${string}`;
  groups: Record<WorldCupGroupId, [string, string, string, string]>;
  tiebreakerTotalGoals: number;
};

export function stableJsonStringify(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return `[${value.map(stableJsonStringify).join(",")}]`;
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const keys = Object.keys(o).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableJsonStringify(o[k])}`).join(",")}}`;
  }
  return "null";
}

export function computePredictionCommitment(payload: PredictionPayloadV2): `0x${string}` {
  // Canonical, stable encoding: stable JSON -> bytes -> keccak256
  const canonical = stableJsonStringify(payload);
  return keccak256(toBytes(canonical));
}

export function predictionStorageKeyV2(leagueAddress: string, walletAddress: string): string {
  return `wc2:prediction:v2:${leagueAddress.toLowerCase()}:${walletAddress.toLowerCase()}`;
}

export type StoredPredictionsV2 = {
  version: 2;
  leagueAddress: `0x${string}`;
  walletAddress: `0x${string}`;
  // newest first
  entries: Array<{
    entryId: string;
    payload: PredictionPayloadV2;
    commitment: `0x${string}`;
    savedAt: string;
    // Optional on-chain index, set after a successful enter() tx.
    entryIndex?: number;
  }>;
};

export function savePredictionToStorage(payload: PredictionPayloadV2): `0x${string}` {
  const key = predictionStorageKeyV2(payload.leagueAddress, payload.walletAddress);
  const commitment = computePredictionCommitment(payload);
  const existing = loadAllPredictionsFromStorage(payload.leagueAddress, payload.walletAddress);
  const prev = existing.entries.find((e) => e.entryId === payload.entryId);
  const filtered = existing.entries.filter((e) => e.entryId !== payload.entryId);
  const next: StoredPredictionsV2 = {
    version: 2,
    leagueAddress: payload.leagueAddress,
    walletAddress: payload.walletAddress,
    entries: [
      {
        entryId: payload.entryId,
        payload,
        commitment,
        savedAt: new Date().toISOString(),
        entryIndex: prev?.entryIndex,
      },
      ...filtered,
    ],
  };
  window.localStorage.setItem(key, stableJsonStringify(next));
  return commitment;
}

export function setEntryIndexInStorage(params: {
  leagueAddress: string;
  walletAddress: string;
  entryId: string;
  entryIndex: number;
}): void {
  const { leagueAddress, walletAddress, entryId, entryIndex } = params;
  const key = predictionStorageKeyV2(leagueAddress, walletAddress);
  const existing = loadAllPredictionsFromStorage(leagueAddress, walletAddress);
  const nextEntries = existing.entries.map((e) => (e.entryId === entryId ? { ...e, entryIndex } : e));
  const next: StoredPredictionsV2 = { ...existing, entries: nextEntries };
  window.localStorage.setItem(key, stableJsonStringify(next));
}

export function getEntryIndexFromStorage(params: {
  leagueAddress: string;
  walletAddress: string;
  entryId: string;
}): number | null {
  const { leagueAddress, walletAddress, entryId } = params;
  const existing = loadAllPredictionsFromStorage(leagueAddress, walletAddress);
  const e = existing.entries.find((x) => x.entryId === entryId);
  const idx = e?.entryIndex;
  return Number.isFinite(idx) ? (idx as number) : null;
}

export function loadAllPredictionsFromStorage(leagueAddress: string, walletAddress: string): StoredPredictionsV2 {
  const key = predictionStorageKeyV2(leagueAddress, walletAddress);
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return {
      version: 2,
      leagueAddress: leagueAddress as `0x${string}`,
      walletAddress: walletAddress as `0x${string}`,
      entries: [],
    };
  }
  try {
    const parsed = JSON.parse(raw) as StoredPredictionsV2;
    if (!parsed || parsed.version !== 2 || !Array.isArray(parsed.entries)) {
      return {
        version: 2,
        leagueAddress: leagueAddress as `0x${string}`,
        walletAddress: walletAddress as `0x${string}`,
        entries: [],
      };
    }
    return parsed;
  } catch {
    return {
      version: 2,
      leagueAddress: leagueAddress as `0x${string}`,
      walletAddress: walletAddress as `0x${string}`,
      entries: [],
    };
  }
}

export function loadPredictionFromStorage(
  leagueAddress: string,
  walletAddress: string,
  entryId?: string | null,
): { payload: PredictionPayloadV2; commitment: `0x${string}` } | null {
  const all = loadAllPredictionsFromStorage(leagueAddress, walletAddress);
  if (all.entries.length === 0) return null;
  const e = entryId ? all.entries.find((x) => x.entryId === entryId) : all.entries[0];
  if (!e) return null;
  return { payload: e.payload, commitment: e.commitment };
}

export function createEntryId(): string {
  try {
    const id = (crypto as unknown as { randomUUID?: () => string })?.randomUUID?.();
    if (id) return id;
  } catch {
    // ignore
  }
  return `e_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

// Best-effort migration from the earlier single-payload v1 key (no wallet scoping).
export function migrateLegacyV1IfPresent(leagueAddress: string, walletAddress: string): void {
  const legacyKey = `wc2:prediction:v1:${leagueAddress.toLowerCase()}`;
  const raw = window.localStorage.getItem(legacyKey);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as LegacyPredictionPayloadV1;
    if (!parsed || parsed.version !== 1) return;
    const entryId = createEntryId();
    const payload: PredictionPayloadV2 = {
      version: 2,
      leagueAddress: parsed.leagueAddress,
      entryId,
      walletAddress: walletAddress as `0x${string}`,
      groups: parsed.groups,
      tiebreakerTotalGoals: parsed.tiebreakerTotalGoals,
    };
    savePredictionToStorage(payload);
    window.localStorage.removeItem(legacyKey);
  } catch {
    // ignore
  }
}

