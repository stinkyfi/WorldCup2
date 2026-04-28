import { getAddress, keccak256, toBytes } from "viem";

export function oracleControllerAddressForChain(chainId: number): `0x${string}` {
  const key = `VITE_ORACLE_CONTROLLER_${chainId}` as const;
  const raw = (import.meta.env as unknown as Record<string, unknown>)[key];
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new Error(`Oracle controller is not configured for this chain. Set ${key} in your environment.`);
  }
  return getAddress(raw) as `0x${string}`;
}

export type OracleStagingGroup = { groupId: number; rankings: [string, string, string, string] };

export function teamKeyToAddress(teamKey: string): `0x${string}` {
  // Must stay consistent with backend cron's derivation.
  // `viem` keccak256 returns 0x-prefixed hex; we take the last 20 bytes as an address.
  const h = keccak256(toBytes(`dd:${teamKey}`));
  return getAddress(`0x${h.slice(-40)}` as `0x${string}`) as `0x${string}`;
}

