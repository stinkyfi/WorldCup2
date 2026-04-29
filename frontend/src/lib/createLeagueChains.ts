/** Mainnet targets for league creation (Story 3.1 / epics UX-DR8). */
export const CREATE_LEAGUE_CHAINS = [
  { chainId: 8453, label: "Base" },
  { chainId: 1, label: "Ethereum" },
  { chainId: 146, label: "Sonic" },
] as const;

export type CreateLeagueChainId = (typeof CREATE_LEAGUE_CHAINS)[number]["chainId"];

const CREATE_LEAGUE_CHAIN_IDS = new Set<number>(CREATE_LEAGUE_CHAINS.map((c) => c.chainId));

export function isCreateLeagueChain(chainId: number): chainId is CreateLeagueChainId {
  return CREATE_LEAGUE_CHAIN_IDS.has(chainId);
}

export function createLeagueChainLabel(chainId: CreateLeagueChainId): string {
  const row = CREATE_LEAGUE_CHAINS.find((c) => c.chainId === chainId);
  return row?.label ?? `Chain ${chainId}`;
}
