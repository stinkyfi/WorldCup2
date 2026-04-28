import { parseAbi } from "viem";

export const oracleControllerAbi = parseAbi([
  "function hasResultsPosted(uint8 groupId) view returns (bool)",
  "function postResults(uint8 groupId, address[4] rankings)",
  "event ResultsPosted(uint8 indexed groupId, address[4] rankings)",
]);

