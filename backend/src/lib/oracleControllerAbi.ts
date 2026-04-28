import { parseAbi } from "viem";

export const oracleControllerAbi = parseAbi([
  "function hasResultsPosted(uint8 groupId) view returns (bool)",
  "function expectedDeadline(uint8 groupId) view returns (uint256)",
  "function getResults(uint8 groupId) view returns (address[4])",
  "function postResults(uint8 groupId, address[4] rankings)",
  "function setResultsForTesting(uint8 groupId, address[4] rankings)",
  "event ResultsPosted(uint8 indexed groupId, address[4] rankings)",
]);

