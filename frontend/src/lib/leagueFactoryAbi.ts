import { parseAbi } from "viem";

/** LeagueFactory + `LeagueCreated` for Story 3.2 on-chain create. */
export const leagueFactoryAbi = parseAbi([
  "function creationFee() view returns (uint256)",
  "function createLeague((address token, uint256 entryFee, uint256 maxEntries, uint256 maxEntriesPerWallet, uint256 minThreshold, uint256 revisionFee, uint8 revisionPolicy, uint256 lockTime) params) payable returns (address league)",
  "event LeagueCreated(address indexed league, address indexed creator)",
]);
