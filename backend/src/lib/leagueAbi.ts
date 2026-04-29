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
  "function lockTime() view returns (uint256)",
  "function disputeDepositToken() view returns (address)",
  "function disputeDepositAmount() view returns (uint256)",
  "function disputeCount() view returns (uint256)",
  "function disputeAt(uint256 disputeId) view returns (address disputant, uint8 groupId, bool isCreator, bool settled)",
  "function dismissDisputeRefundDeposit(uint256 disputeId)",
  "function dismissDisputeConfiscate(uint256 disputeId)",
  "function triggerRefund()",
  "event DisputeFiled(address indexed disputant, uint8 indexed groupId, bool isCreator)",
]);
