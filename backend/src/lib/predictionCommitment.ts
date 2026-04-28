import { keccak256, toBytes } from "viem";

export type PredictionPayloadV2 = {
  version: 2;
  leagueAddress: `0x${string}`;
  entryId: string;
  walletAddress: `0x${string}`;
  groups: Record<string, [string, string, string, string]>;
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
  const canonical = stableJsonStringify(payload);
  return keccak256(toBytes(canonical));
}

