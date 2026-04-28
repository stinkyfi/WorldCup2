import { parseAbi } from "viem";

/** Minimal League ABI for indexer reads + Merkle root posting (Story 8.1). */
export const leagueAbi = parseAbi([
  "function state() view returns (uint8)",
  "function merkleRoot() view returns (bytes32)",
  "function creator() view returns (address)",
  "function devWallet() view returns (address)",
  "function oracleController() view returns (address)",
  "function entryFee() view returns (uint256)",
  "function totalEntries() view returns (uint256)",
  "function devFeeBps() view returns (uint256)",
  "function creatorFeeCap() view returns (uint256)",
  "function setMerkleRoot(bytes32 root)",
]);
