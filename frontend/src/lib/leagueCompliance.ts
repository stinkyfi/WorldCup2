import { apiUrl } from "@/lib/apiBase";

export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type ComplianceStatusResponse = {
  data: { acknowledged: boolean; acknowledgedAt: string | null };
};

export async function fetchComplianceStatus(address: string, signal?: AbortSignal): Promise<ComplianceStatusResponse> {
  const res = await fetch(apiUrl(`/api/v1/leagues/by-address/${address}/compliance`), {
    signal,
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  if (res.status === 401) throw new HttpError(401, "Sign in required");
  if (res.status === 404) throw new HttpError(404, "League not found");
  if (!res.ok) throw new HttpError(res.status, `Compliance status request failed: ${res.status}`);
  return (await res.json()) as ComplianceStatusResponse;
}

export async function postComplianceAck(address: string): Promise<ComplianceStatusResponse> {
  const res = await fetch(apiUrl(`/api/v1/leagues/by-address/${address}/compliance`), {
    method: "POST",
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  if (res.status === 401) throw new HttpError(401, "Sign in required");
  if (res.status === 404) throw new HttpError(404, "League not found");
  if (!res.ok) throw new HttpError(res.status, `Compliance acknowledge request failed: ${res.status}`);
  return (await res.json()) as ComplianceStatusResponse;
}

