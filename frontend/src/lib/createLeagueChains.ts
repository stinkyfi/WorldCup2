/** Mainnet targets for league creation (Story 3.1 / epics UX-DR8). */
export const CREATE_LEAGUE_CHAINS = [
  { chainId: 8453, label: "Base" },
  { chainId: 1, label: "Ethereum" },
  { chainId: 146, label: "Sonic" },
] as const;

export type CreateLeagueChainId = (typeof CREATE_LEAGUE_CHAINS)[number]["chainId"];
