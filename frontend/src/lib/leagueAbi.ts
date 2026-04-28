import { parseAbi } from "viem";

/** Minimal League ABI for Story 3.3 (threshold + refunds). */
export const leagueAbi = parseAbi([
  "function state() view returns (uint8)",
  "function lockTime() view returns (uint256)",
  "function minThreshold() view returns (uint256)",
  "function totalEntries() view returns (uint256)",
  "function entryFee() view returns (uint256)",
  "function token() view returns (address)",
  "function enter(bytes32 commitmentHash)",
  "event EntrySubmitted(address indexed player, bytes32 commitmentHash)",
  "function checkThreshold()",
  "function claimRefund()",
]);

