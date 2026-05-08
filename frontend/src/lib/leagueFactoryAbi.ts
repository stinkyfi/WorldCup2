import { parseAbi } from "viem";

/** LeagueFactory ABI — league creation (Story 3.2) + admin parameter management (Story 10.1). */
export const leagueFactoryAbi = parseAbi([
  // ─── Creation (Story 3.2) ────────────────────────────────────────────────
  "function creationFee() view returns (uint256)",
  "function createLeague((address token, uint256 entryFee, uint256 maxEntries, uint256 maxEntriesPerWallet, uint256 minThreshold, uint256 revisionFee, uint8 revisionPolicy, uint256 lockTime) params) payable returns (address league)",
  "event LeagueCreated(address indexed league, address indexed creator)",

  // ─── Global param reads (Story 10.1) ────────────────────────────────────
  "function devFeeBps() view returns (uint256)",
  "function creatorFeeCap() view returns (uint256)",
  "function minEntryAmount() view returns (uint256)",
  "function creationsPaused() view returns (bool)",
  "function disputeDepositToken() view returns (address)",
  "function disputeDepositAmount() view returns (uint256)",
  "function refundAuthority() view returns (address)",

  // ─── Owner writes (Story 10.1) ───────────────────────────────────────────
  "function setGlobalParams(uint256 devFeeBps_, uint256 creatorFeeCap_, uint256 minEntryAmount_)",
  "function setCreationFee(uint256 fee_)",
  "function setCreationsPaused(bool paused_)",
  "function setDisputeConfig(address token_, uint256 amount_, address refundAuthority_)",

  // ─── Events (Story 10.1) ────────────────────────────────────────────────
  "event GlobalParamsUpdated(uint256 devFeeBps, uint256 creatorFeeCap, uint256 minEntryAmount)",
  "event CreationsPausedUpdated(bool paused)",
  "event CreationFeeUpdated(uint256 newFee)",
  "event DisputeConfigUpdated(address indexed token, uint256 amount, address indexed refundAuthority_)",
]);
