import { keccak256, toBytes } from "viem";
import type { WorldCupGroupId } from "@/lib/worldCupGroups";

export type PredictionPayloadV1 = {
  version: 1;
  leagueAddress: `0x${string}`;
  // Rankings are team ids in position order [1,2,3,4]
  groups: Record<WorldCupGroupId, [string, string, string, string]>;
  tiebreakerTotalGoals: number; // 1..1000
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

export function computePredictionCommitment(payload: PredictionPayloadV1): `0x${string}` {
  // Canonical, stable encoding: stable JSON -> bytes -> keccak256
  const canonical = stableJsonStringify(payload);
  return keccak256(toBytes(canonical));
}

export function predictionStorageKey(leagueAddress: string): string {
  return `wc2:prediction:v1:${leagueAddress.toLowerCase()}`;
}

export function savePredictionToStorage(payload: PredictionPayloadV1): void {
  const key = predictionStorageKey(payload.leagueAddress);
  window.localStorage.setItem(key, stableJsonStringify(payload));
}

export function loadPredictionFromStorage(leagueAddress: string): PredictionPayloadV1 | null {
  const key = predictionStorageKey(leagueAddress);
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PredictionPayloadV1;
    if (!parsed || parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

