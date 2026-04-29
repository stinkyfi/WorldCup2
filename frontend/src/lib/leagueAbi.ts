import { parseAbi } from "viem";

/** Minimal League ABI for Story 3.3 (threshold + refunds). */
export const leagueAbi = parseAbi([
  "function merkleRoot() view returns (bytes32)",
  "function merkleRootSetAt() view returns (uint256)",
  "function state() view returns (uint8)",
  "function lockTime() view returns (uint256)",
  "function revisionPolicy() view returns (uint8)",
  "function revisionFee() view returns (uint256)",
  "function minThreshold() view returns (uint256)",
  "function totalEntries() view returns (uint256)",
  "function entryFee() view returns (uint256)",
  "function token() view returns (address)",
  "function walletEntryCount(address wallet) view returns (uint256)",
  "function commitmentOf(address wallet, uint256 entryIndex) view returns (bytes32)",
  "function enter(bytes32 commitmentHash)",
  "event EntrySubmitted(address indexed player, bytes32 commitmentHash)",
  "function revise(uint256 entryIndex, bytes32 newCommitmentHash)",
  "event EntryRevised(address indexed player, uint256 indexed entryIndex, bytes32 commitmentHash, uint256 feePaid)",
  "function checkThreshold()",
  "function claimRefund()",
  "function claimPrize(uint256 amount, bytes32[] proof)",
]);

