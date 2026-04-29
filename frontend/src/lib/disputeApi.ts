import { apiUrl } from "@/lib/apiBase";
import { getAddress } from "viem";

export type DisputeEligibility = {
  eligible: boolean;
  reason: string | null;
  windowEndsAt: string | null;
  disputeDepositToken: string | null;
  disputeDepositAmount: string | null;
};

export async function fetchDisputeEligibility(
  chainId: number,
  leagueAddress: string,
  signal?: AbortSignal,
): Promise<{ data: DisputeEligibility }> {
  const addr = getAddress(leagueAddress);
  const res = await fetch(
    apiUrl(`/api/v1/disputes/eligibility?chainId=${chainId}&leagueAddress=${encodeURIComponent(addr)}`),
    { signal, headers: { Accept: "application/json" } },
  );
  if (!res.ok) {
    throw new Error(`Eligibility request failed (${res.status})`);
  }
  return (await res.json()) as { data: DisputeEligibility };
}

export async function recordDisputeMetadata(input: {
  chainId: number;
  leagueAddress: string;
  txHash: `0x${string}`;
  description: string;
}): Promise<{ data: { id: string; duplicate: boolean } }> {
  const res = await fetch(apiUrl("/api/v1/disputes/record"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      chainId: input.chainId,
      leagueAddress: getAddress(input.leagueAddress),
      txHash: input.txHash,
      description: input.description,
    }),
  });
  const json = (await res.json()) as { data?: { id: string; duplicate: boolean }; error?: string };
  if (!res.ok) {
    throw new Error(json.error ?? `Record failed (${res.status})`);
  }
  if (!json.data) throw new Error("Invalid response");
  return { data: json.data };
}

export type DisputeSettlementKind =
  | "dismiss_refund"
  | "dismiss_confiscate"
  | "override_results"
  | "trigger_refund";

export type AdminDisputeReview = {
  dispute: {
    id: string;
    chainId: number;
    leagueAddress: string;
    leagueTitle: string;
    txHash: string;
    disputant: string;
    groupId: number;
    groupLabel: string;
    isCreator: boolean;
    description: string;
    createdAt: string;
  };
  rankings: {
    oracleTeamKeys: [string, string, string, string] | null;
    oracleReadError: string | null;
    referenceTeamKeys: string[] | null;
    referenceSource: "staging_json" | null;
    referenceNote: string | null;
    oracleMatchesReference: boolean | null;
  };
  deposit: { kind: "creator_waived" } | { kind: "erc20"; tokenAddress: string | null; amountWei: string | null };
  relatedOpenDisputes: Array<{
    id: string;
    txHash: string;
    disputant: string;
    isCreator: boolean;
    description: string;
    createdAt: string;
  }>;
  resolution: {
    onChainDisputeIndex: number | null;
    onChainDisputeIndexHint: string | null;
    oracleController: string | null;
  };
};

export async function fetchAdminDisputeReview(
  disputeId: string,
  signal?: AbortSignal,
): Promise<{ data: AdminDisputeReview }> {
  const res = await fetch(apiUrl(`/api/v1/admin/disputes/${encodeURIComponent(disputeId)}`), {
    credentials: "include",
    headers: { Accept: "application/json" },
    signal,
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error("Admin session required.");
  }
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as { data: AdminDisputeReview };
}

export async function recordDisputeSettlement(
  disputeId: string,
  body: { txHash: `0x${string}`; kind: DisputeSettlementKind },
): Promise<{ data: { id: string; duplicate?: boolean; updatedCount?: number } }> {
  const res = await fetch(apiUrl(`/api/v1/admin/disputes/${encodeURIComponent(disputeId)}/settle`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    data?: { id: string; duplicate?: boolean; updatedCount?: number };
    error?: string;
    code?: string;
  };
  if (!res.ok) {
    throw new Error(json.error ?? `Settlement record failed (${res.status})`);
  }
  if (!json.data) throw new Error("Invalid response");
  return { data: json.data };
}
