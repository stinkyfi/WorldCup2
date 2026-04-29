import { parseAbi } from "viem";

export const oracleControllerAbi = parseAbi([
  "function hasResultsPosted(uint8 groupId) view returns (bool)",
  "function expectedDeadline(uint8 groupId) view returns (uint256)",
  "function extendGracePeriod(uint8 groupId, uint256 additionalSeconds)",
  "function postResults(uint8 groupId, address[4] rankings)",
  "function overrideResults(uint8 groupId, address[4] rankings)",
  "event ResultsPosted(uint8 indexed groupId, address[4] rankings)",
  "event GracePeriodExtended(uint8 indexed groupId, uint256 newDeadline)",
]);

